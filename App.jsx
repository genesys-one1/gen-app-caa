import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import TeamChat from './pages/TeamChat';
import VisitDetails from './pages/VisitDetails';
import AuditLogs from './pages/AuditLogs';
import ConsentIntake from './pages/ConsentIntake';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show branded loading screen while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0033A0 0%, #0046B3 50%, #0EA5A4 100%)' }}>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a87eb16bd636d586c8e91f/ce25c2af9_1.png"
          alt="GeneSys"
          className="h-16 mb-6"
        />
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        <p className="mt-4 text-white/70 text-sm font-medium">Empowering Clinics, Elevating Care</p>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/TeamChat" element={
        <LayoutWrapper currentPageName="TeamChat">
          <TeamChat />
        </LayoutWrapper>
      } />
      <Route path="/VisitDetails" element={
        <LayoutWrapper currentPageName="VisitDetails">
          <VisitDetails />
        </LayoutWrapper>
      } />
      <Route path="/visit/:visit_number" element={
        <LayoutWrapper currentPageName="VisitDetails">
          <VisitDetails />
        </LayoutWrapper>
      } />
      <Route path="/AuditLogs" element={
        <LayoutWrapper currentPageName="AuditLogs">
          <AuditLogs />
        </LayoutWrapper>
      } />
      <Route path="/ConsentIntake" element={<ConsentIntake />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App