import { Link } from "react-router-dom";
import type { Competition, FootballSnapshot } from "../../domain/model";
import { competitionStandings } from "../../domain/rules";
import { Empty, TeamMark } from "./components";

export function StandingsTable({
  snapshot,
  competition,
  compact = false,
}: Readonly<{ snapshot: FootballSnapshot; competition: Competition; compact?: boolean }>) {
  const rows = competitionStandings(snapshot, competition.id);
  if (!rows.length)
    return <Empty>No hay resultados suficientes para generar la clasificación.</Empty>;
  return (
    <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Equipo</th>
            <th scope="col">PJ</th>
            {!compact && (
              <>
                <th scope="col">PG</th>
                <th scope="col">PE</th>
                <th scope="col">PP</th>
                <th scope="col">GF</th>
                <th scope="col">GC</th>
                <th scope="col">DG</th>
              </>
            )}
            <th scope="col">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team.id}>
              <td>{index + 1}</td>
              <td>
                <TeamMark team={row.team} />
                <Link to={`/teams/${row.team.id}`}>{row.team.short_name}</Link>
              </td>
              <td>{row.played}</td>
              {!compact && (
                <>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                  <td>{row.goalDifference}</td>
                </>
              )}
              <td>
                <strong>{row.points}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
