import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AdminHome, AdminResourcePage, LoginPage } from "../features/admin/admin-pages";
import {
  CalendarPage, CircuitDetailPage, CircuitsPage, DriverDetailPage, DriversPage,
  HomePage, SeasonPage, TeamDetailPage, TeamsPage,
} from "../features/public/public-pages";
import { AppLayout, ErrorPage } from "./layout";
import { RacingProvider } from "./racing-context";
import "./racing.css";

const router = createBrowserRouter([{
  path: "/", element: <AppLayout />, errorElement: <ErrorPage />, children: [
    { index: true, element: <HomePage /> },
    { path: "season", element: <SeasonPage /> },
    { path: "drivers", element: <DriversPage /> },
    { path: "drivers/:id", element: <DriverDetailPage /> },
    { path: "teams", element: <TeamsPage /> },
    { path: "teams/:id", element: <TeamDetailPage /> },
    { path: "circuits", element: <CircuitsPage /> },
    { path: "circuits/:id", element: <CircuitDetailPage /> },
    { path: "calendar", element: <CalendarPage /> },
    { path: "login", element: <LoginPage /> },
    { path: "admin", element: <AdminHome /> },
    { path: "admin/:resource", element: <AdminResourcePage /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
}]);

export function App() {
  return <RacingProvider><RouterProvider router={router} /></RacingProvider>;
}
