import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";

export class Server {
  private httpServer: HTTPServer;
  private app: Application;
  private io: SocketIOServer;

  private activeSockets: string[] = [];

  private readonly DEFAULT_PORT = 5000;

  constructor() {
    this.initialize();
  }

  //configuraçao da aplicaçao

  private initialize(): void {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = socketIO(this.httpServer);

    this.configureApp();
    this.configureRoutes();
    this.handleSocketConnection();
  }

  //declaração da pasta default da app

  private configureApp(): void {
    this.app.use(express.static(path.join(__dirname, "../public")));
  }

  //Determina que ficheiro é utilizado na pagina inicial do servidor 

  private configureRoutes(): void {
    this.app.get("/", (req, res) => {
      res.sendFile("index.html");
    });
  }

  //WebSockets

  private handleSocketConnection(): void {
    this.io.on("connection", socket => {
      const existingSocket = this.activeSockets.find(
        existingSocket => existingSocket === socket.id
      );

      if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.emit("update-user-list", {
          users: this.activeSockets.filter(
            existingSocket => existingSocket !== socket.id
          )
        });

        socket.broadcast.emit("update-user-list", {
          users: [socket.id]
        });
      }

      socket.on("call-user", (data: any) => {
        socket.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: socket.id
        });
      });

      socket.on("make-answer", data => {
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer
        });
      });

      socket.on("reject-call", data => {
        socket.to(data.from).emit("call-rejected", {
          socket: socket.id
        });
      });

      socket.on("disconnect", () => {
        this.activeSockets = this.activeSockets.filter(
          existingSocket => existingSocket !== socket.id
        );
        socket.broadcast.emit("remove-user", {
          socketId: socket.id
        });
      });
    });
  }

  //defenições do servidor

  public listen(callback: (port: number) => void): void {
    this.httpServer.listen(this.DEFAULT_PORT, () => {
      callback(this.DEFAULT_PORT);
    });
  }
}
