import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import {
  AdminDrawPage,
  AdminHome,
  AdminResourcePage,
  LoginPage,
} from "../features/admin/admin-pages";
import {
  DrawsPage,
  HeadToHeadPage,
  HistoryPage,
  HomePage,
  MatchDetailPage,
  MatchesPage,
  PlayerDetailPage,
  PlayersPage,
  RankingPage,
  StatsPage,
  TournamentDetailPage,
  TournamentsPage,
} from "../features/public/public-pages";
import { AppLayout, ErrorPage } from "./layout";
import { TennisProvider } from "./tennis-context";
import "./tennis.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "tournaments", element: <TournamentsPage /> },
      { path: "tournaments/:id", element: <TournamentDetailPage /> },
      { path: "draws", element: <DrawsPage /> },
      { path: "players", element: <PlayersPage /> },
      { path: "players/:id", element: <PlayerDetailPage /> },
      { path: "players/:id/h2h/:opponentId", element: <HeadToHeadPage /> },
      { path: "h2h", element: <HeadToHeadPage /> },
      { path: "matches", element: <MatchesPage /> },
      { path: "matches/:id", element: <MatchDetailPage /> },
      { path: "ranking", element: <RankingPage /> },
      { path: "stats", element: <StatsPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "admin", element: <AdminHome /> },
      { path: "admin/draw", element: <AdminDrawPage /> },
      { path: "admin/:resource", element: <AdminResourcePage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
export function App() {
  return (
    <TennisProvider>
      <RouterProvider router={router} />
    </TennisProvider>
  );
}
