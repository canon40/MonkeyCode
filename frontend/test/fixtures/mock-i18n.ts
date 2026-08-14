const i18n = {
  isInitialized: true,
  t: (key: string) => key,
};

export async function initI18n() {
  return i18n;
}

export default i18n;
