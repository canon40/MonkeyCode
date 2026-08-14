// Command devserver is a LOCAL DEVELOPMENT ONLY entrypoint for the MonkeyCode
// backend.
//
// The open-source backend is designed to be embedded as a library: the
// enterprise "member manager" (domain.MemberManager) is injected by a private
// wrapper via bridge.go (see WithMemberManager). Because that implementation is
// not shipped in this open-source repository, the standalone cmd/server binary
// cannot finish dependency-injection wiring on its own (it panics with
// "could not find service *domain.MemberManager").
//
// This launcher mirrors cmd/server/main.go but registers a no-op
// domain.MemberManager stub so the real HTTP server, migrations, auth/login and
// console APIs can be exercised locally with just PostgreSQL + Redis. The stub
// only affects the "add member / add admin / OIDC auto-create" admin endpoints
// (which return an explicit not-implemented error); all other flows use the
// real production code paths.
//
// DO NOT use this in production. Build the private wrapper instead.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/GoYoko/web"
	"github.com/google/uuid"
	"github.com/samber/do"

	"github.com/chaitin/MonkeyCode/backend/biz"
	hostrepo "github.com/chaitin/MonkeyCode/backend/biz/host/repo"
	hostusecase "github.com/chaitin/MonkeyCode/backend/biz/host/usecase"
	"github.com/chaitin/MonkeyCode/backend/config"
	"github.com/chaitin/MonkeyCode/backend/domain"
	"github.com/chaitin/MonkeyCode/backend/pkg"
	"github.com/chaitin/MonkeyCode/backend/pkg/service"
	"github.com/chaitin/MonkeyCode/backend/pkg/store"
	"github.com/chaitin/MonkeyCode/backend/pkg/telemetry"
)

// devMemberManager is a no-op stub for the enterprise domain.MemberManager that
// is not part of the open-source build. Member-management admin endpoints return
// an explicit error; login/seed and all other flows are unaffected.
type devMemberManager struct{}

var errDevMemberManager = fmt.Errorf("member management is not available in the open-source dev server")

func (devMemberManager) AddUser(context.Context, *domain.TeamUser, *domain.AddTeamUserReq) (*domain.AddTeamUserResp, error) {
	return nil, errDevMemberManager
}

func (devMemberManager) AddUserWithPassword(context.Context, *domain.TeamUser, *domain.AddTeamUserReq) (*domain.AddTeamUserWithPasswordResp, error) {
	return nil, errDevMemberManager
}

func (devMemberManager) AddAdmin(context.Context, *domain.TeamUser, *domain.AddTeamAdminReq) (*domain.AddTeamAdminResp, error) {
	return nil, errDevMemberManager
}

func (devMemberManager) AutoCreateOIDCMember(context.Context, uuid.UUID, *domain.OIDCExternalUser) (*domain.User, error) {
	return nil, errDevMemberManager
}

var _ domain.MemberManager = devMemberManager{}

// devServerConfigProvider reports a private-edition server config so the web
// console can read runtime settings (notably captcha_enabled) from
// /api/v1/server/config. Without a provider that route is not registered and
// the frontend defaults captcha to enabled.
type devServerConfigProvider struct{ cfg *config.Config }

func (p devServerConfigProvider) GetServerConfig(context.Context) (domain.ServerConfig, error) {
	return domain.ServerConfig{
		Edition:        domain.ProductEditionPrivate,
		CaptchaEnabled: p.cfg.Security.CaptchaEnabled,
	}, nil
}

var _ domain.ServerConfigProvider = devServerConfigProvider{}

func main() {
	cfg, err := config.Init("./config/server")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	injector := do.New()
	do.ProvideValue(injector, cfg)

	if err := pkg.RegisterInfra(injector); err != nil {
		fmt.Fprintf(os.Stderr, "failed to register infra: %v\n", err)
		os.Exit(1)
	}

	l := do.MustInvoke[*slog.Logger](injector)
	w := do.MustInvoke[*web.Web](injector)
	shutdownTelemetry, err := telemetry.Setup(context.Background(), cfg.Telemetry)
	if err != nil {
		l.Warn("failed to setup telemetry, tracing disabled", "error", err)
		shutdownTelemetry = func(context.Context) error { return nil }
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := shutdownTelemetry(ctx); err != nil {
			l.Warn("failed to shutdown telemetry", "error", err)
		}
	}()

	if err := store.MigrateSQL(cfg, l); err != nil {
		l.Error("failed to migrate database", "error", err)
		os.Exit(1)
	}

	// Inject the open-source dev stub for the enterprise member manager before
	// business modules are invoked, so DI wiring can complete.
	do.ProvideValue[domain.MemberManager](injector, devMemberManager{})

	// Public-host support is normally enabled by the private wrapper via
	// bridge.WithPublicHost(); register the same providers here so the git
	// module (which requires *domain.PublicHostUsecase) can wire up.
	do.Provide(injector, hostrepo.NewPublicHostRepo)
	do.Provide(injector, hostusecase.NewPublicHostUsecase)

	// Expose /api/v1/server/config so the web console can read runtime settings.
	do.ProvideValue[domain.ServerConfigProvider](injector, devServerConfigProvider{cfg: cfg})

	biz.RegisterAll(injector)
	biz.RegisterOpenSource(injector)
	biz.InvokeAll(injector)
	biz.InvokeOpenSource(injector)

	w.PrintRoutes()
	svc := service.NewService(
		service.WithPprof(),
		service.WithLogger(l),
	)
	svc.Add(&server{w: w, addr: cfg.Server.Addr})

	l.Info("starting dev server", "addr", cfg.Server.Addr)
	if err := svc.Run(); err != nil {
		l.Error("server error", "error", err)
	}
}

type server struct {
	w    *web.Web
	addr string
}

func (s *server) Name() string { return "MonkeyCode Dev Service" }
func (s *server) Start() error { return s.w.Run(s.addr) }
func (s *server) Stop() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return s.w.Echo().Shutdown(ctx)
}
