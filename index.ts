import env from "./env";

const file = Bun.file("index.html");
const trumpet = Bun.file("trumpet.mp3");

Bun.serve({
  async fetch(request, server) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response(file, {
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

    if (url.pathname === "/api/data") {
      const token = btoa(`${env.username}:${env.token}`);
      const events = await fetch(
        "https://frc-api.firstinspires.org/v3.0/2025/events/?teamNumber=2539",
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${token}`,
          },
        }
      );
      const data = await events.json();

      const week8events = data.Events.filter((e: any) => e.weekNumber === 8);
      return new Response(JSON.stringify(week8events), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return new Response("404", {
      status: 404,
    });
  },
});
