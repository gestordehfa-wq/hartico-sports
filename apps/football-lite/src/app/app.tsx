import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AdminHome, AdminResourcePage, LoginPage } from "../features/admin/admin-pages";
import { CompetitionControlPage } from "../features/admin/competition-control";
import {
  CompetitionDetailPage,
  CompetitionsPage,
  HistoryPage,
  HomePage,
  MatchDetailPage,
  MatchesPage,
  PlayerDetailPage,
  PlayersPage,
  StandingsPage,
  StatsPage,
  TeamDetailPage,
  TeamsPage,
} from "../features/public/public-pages";
import { FootballProvider } from "./football-context";
import { AppLayout, ErrorPage } from "./layout";
import "./football.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "competitions", element: <CompetitionsPage /> },
      { path: "competitions/:id", element: <CompetitionDetailPage /> },
      { path: "teams", element: <TeamsPage /> },
      { path: "teams/:id", element: <TeamDetailPage /> },
      { path: "players", element: <PlayersPage /> },
      { path: "players/:id", element: <PlayerDetailPage /> },
      { path: "matches", element: <MatchesPage /> },
      { path: "matches/:id", element: <MatchDetailPage /> },
      { path: "standings", element: <StandingsPage /> },
      { path: "stats", element: <StatsPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "admin", element: <AdminHome /> },
      { path: "admin/competition-control", element: <CompetitionControlPage /> },
      { path: "admin/:resource", element: <AdminResourcePage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

export function App() {
  return (
    <FootballProvider>
      <RouterProvider router={router} />
    </FootballProvider>
  );
}
