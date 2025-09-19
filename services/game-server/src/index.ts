import fastify from "fastify";
import socketio from "fastify-socket.io";

const server = fastify({
  logger: true,
});

async function buildServer() {
  await server.register(socketio, {
    cors: {
      origin: true,
    },
  });

  server.get("/health", async () => ({ status: "ok" }));

  server.io.on("connection", (socket) => {
    socket.emit("server:welcome", { message: "Skribble game server online" });
  });

  return server;
}

export async function start() {
  await buildServer();
  try {
    await server.listen({ port: Number(process.env.PORT) || 4000, host: "0.0.0.0" });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void start();
}
