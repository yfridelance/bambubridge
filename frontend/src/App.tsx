import { Refine } from "@refinedev/core";
import { RefineThemes, ThemedLayout, useNotificationProvider } from "@refinedev/antd";
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { ConfigProvider, App as AntdApp, theme } from "antd";
import {
  HomeOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  TagOutlined,
  SettingOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

import { dataProvider } from "./providers/dataProvider";
import { liveProvider } from "./providers/liveProvider";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { HomePage } from "./pages/home";
import { SpoolsListPage, SpoolShowPage } from "./pages/spools";
import { PrintsListPage, PrintShowPage } from "./pages/prints";
import { TagsPage, WriteTagPage, LinkBambuPage } from "./pages/tags";
import { FillTrayPage } from "./pages/fill-tray";
import { IssuesPage } from "./pages/issues";
import { SettingsPage } from "./pages/settings";

import "@refinedev/antd/dist/reset.css";

function AppContent() {
  const { t, i18n } = useTranslation();
  const { themeMode } = useTheme();

  const i18nProvider = {
    translate: (key: string, options?: Record<string, unknown>) => String(t(key, options as never)),
    changeLocale: (lang: string) => i18n.changeLanguage(lang),
    getLocale: () => i18n.language,
  };

  return (
    <ConfigProvider
      theme={{
        ...RefineThemes.Blue,
        algorithm: themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
        <AntdApp>
          <Refine
            dataProvider={dataProvider}
            liveProvider={liveProvider}
            routerProvider={routerProvider}
            notificationProvider={useNotificationProvider()}
            i18nProvider={i18nProvider}
            resources={[
              {
                name: "home",
                list: "/",
                meta: {
                  label: t("nav.home"),
                  icon: <HomeOutlined />,
                },
              },
              {
                name: "spools",
                list: "/spools",
                show: "/spools/:id",
                meta: {
                  label: t("nav.spools"),
                  icon: <DatabaseOutlined />,
                },
              },
              {
                name: "prints",
                list: "/prints",
                show: "/prints/:id",
                meta: {
                  label: t("nav.prints"),
                  icon: <HistoryOutlined />,
                },
              },
              {
                name: "tags",
                list: "/tags",
                meta: {
                  label: t("nav.tags"),
                  icon: <TagOutlined />,
                },
              },
              {
                name: "issues",
                list: "/issues",
                meta: {
                  label: t("nav.issues"),
                  icon: <WarningOutlined />,
                },
              },
              {
                name: "settings",
                list: "/settings",
                meta: {
                  label: t("nav.settings"),
                  icon: <SettingOutlined />,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
              liveMode: "auto",
              disableTelemetry: true,
            }}
          >
            <Routes>
              <Route
                element={
                  <ThemedLayout
                    Header={() => <Header />}
                    Footer={() => <Footer />}
                    Title={({ collapsed }) => (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img
                          src={themeMode === "dark" ? "/logo_dark.webp" : "/logo.webp"}
                          alt="Logo"
                          style={{ height: 24 }}
                        />
                        {!collapsed && <span style={{ fontWeight: 600 }}>BambuBridge</span>}
                      </div>
                    )}
                  >
                    <Outlet />
                  </ThemedLayout>
                }
              >
                <Route index element={<HomePage />} />
                <Route path="/spools">
                  <Route index element={<SpoolsListPage />} />
                  <Route path=":id" element={<SpoolShowPage />} />
                </Route>
                <Route path="/prints">
                  <Route index element={<PrintsListPage />} />
                  <Route path=":id" element={<PrintShowPage />} />
                </Route>
                <Route path="/tags">
                  <Route index element={<TagsPage />} />
                  <Route path="write/:spoolId" element={<WriteTagPage />} />
                  <Route path="link-bambu" element={<LinkBambuPage />} />
                </Route>
                <Route path="/fill-tray" element={<FillTrayPage />} />
                <Route path="/issues" element={<IssuesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </AntdApp>
      </ConfigProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
