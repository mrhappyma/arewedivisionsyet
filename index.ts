import env from "./env";

const live = Bun.file("live.html");
const trumpet = Bun.file("trumpet.mp3");

const year = 2025;
const token = btoa(`${env.username}:${env.token}`);

let divisions = false;
const divisionsLive = async () => {
  if (divisions) return true;
  const events = await fetch(
    `https://frc-api.firstinspires.org/v3.0/${year}/teams/?eventCode=archimedes`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${token}`,
      },
    }
  );
  const data = await events.json();
  const gotDivisions = data.teamCountTotal > 0;
  if (gotDivisions) {
    console.log("HALELUJAH");
    divisions = true;
  }
  return gotDivisions;
};

const getTeamDivision = async (teamNumber: number) => {
  try {
    const events = await fetch(
      `https://frc-api.firstinspires.org/v3.0/${year}/events/?teamNumber=${teamNumber}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${token}`,
        },
      }
    );
    const data = await events.json();

    const week8events = data.Events.filter(
      (e: any) => e.type == "ChampionshipDivision"
    );
    return week8events.length > 0 ? week8events[0].code : null;
  } catch (e) {
    return null;
  }
};

const sockets = new Map<string, Bun.ServerWebSocket<{ teamNumber: number }>>();
setInterval(async () => {
  console.log(`${sockets.size} sockets connected`);
  const out = await divisionsLive();
  for (const [id, ws] of sockets.entries()) {
    ws.ping();
    if (!out) continue;
    const division = await getTeamDivision(ws.data.teamNumber);
    if (division) {
      ws.send(JSON.stringify({ division }));
    } else {
      ws.send(JSON.stringify({ division: "DIVISIONS ARE OUT" }));
    }
    ws.close();
  }
}, 2000);

Bun.serve({
  websocket: {
    open(ws: Bun.ServerWebSocket<{ teamNumber: number; id: string }>) {
      sockets.set(ws.data.id, ws);
      console.log(`WebSocket opened for team ${ws.data.teamNumber}`);
    },
    message(ws, message) {},
    close(ws) {
      sockets.delete(ws.data.id);
      console.log("WebSocket closed");
    },
  },
  async fetch(request, server) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return Response.redirect("/2539", 307);
    }

    if (url.pathname.match(/^\/+\d{1,5}$/)) {
      return new Response(live, {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    if (url.pathname === "/trumpet.mp3") {
      return new Response(trumpet, {
        headers: {
          "Content-Type": "audio/mp3",
        },
      });
    }

    if (url.pathname.match(/^\/socket\/+\d{1,5}$/)) {
      const upgraded = server.upgrade(request, {
        data: {
          id: Math.random().toString(36).substring(2),
          teamNumber: parseInt(url.pathname.split("/").pop()!),
        },
      });
      if (!upgraded) return new Response("upgrade failed", { status: 400 });
    }

    return new Response("404", {
      status: 404,
    });
  },
});
