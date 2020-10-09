import  * as path from 'path';
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';
import { expect } from 'chai';

describe("DockerComposeEnvironment", () => {

  let environment:StartedDockerComposeEnvironment;

  before(async () => {
    const composeFilePath = path.resolve("docker/");
    const composeFile = "docker-compose.yml";

    console.log(composeFilePath + "/" + composeFile);
    environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
      .withWaitStrategy("postgres",Wait.forHealthCheck())
      .withWaitStrategy("datapm-registry",Wait.forHealthCheck())
      .up();

 
  });

  after(async () => {

    environment.stop();
    
  });

  it("works", async () => {
    expect(1).equal(1);
  });

});