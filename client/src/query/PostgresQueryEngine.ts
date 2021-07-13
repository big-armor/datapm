import Dockerode, { Container } from "dockerode";
import { QueryEngine, QueryResults } from "./QueryUtil";

const DOCKER_CONTAINER_NAME = "datapm-query-postgres";

export class PostgresQueryEngine implements QueryEngine {
	container: Container;

	identifier(): string {
		return "postgres";
	}

	async prepare(): Promise<boolean> {
		const docker = new Dockerode({ socketPath: "/var/run/docker.sock" });

		let image = docker.getImage("postgres:12");
		if (image == null) {
			image = await docker.pull("postgres:12");
		}

		const containerInfos = await docker.listContainers({ all: 1 });
		const containerInfo = containerInfos.find((c) => c.Names.indexOf("/" + DOCKER_CONTAINER_NAME) !== -1);

		if (containerInfo == null) {
			this.container = await docker.createContainer({
				name: DOCKER_CONTAINER_NAME,
				Image: "postgres:12",
				Cmd: ["postgres"],
				HostConfig: {
					PortBindings: {
						"5432/tcp": [
							{
								HostPort: "2345"
							}
						]
					},
					Binds: ["/tmp/datapm-postgres-query:/var/lib/postgresql/data"]
				}
			});
		} else {
			this.container = docker.getContainer(containerInfo.Id);
		}

		await this.container.start();

		return true;
	}

	query(): Promise<QueryResults> {
		throw new Error("Method not implemented.");
	}

	shutdown(): Promise<void> {
		return this.container.stop();
	}
}
