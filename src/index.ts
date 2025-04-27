import "reflect-metadata";
import "module-alias";

async function bootstrap() {
  console.log("System initialized.");
  // throw new Error("Error");
}

bootstrap().catch((err) => {
  console.error("System failed to initialize.", err);
  process.exit(1);
});
