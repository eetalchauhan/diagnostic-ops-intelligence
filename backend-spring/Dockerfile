# Stage 1: Build the JAR with Maven and Java 17
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source and build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Minimal JRE runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=builder /app/target/diagnostic-ops-backend-*.jar app.jar

ENV PORT=8080
EXPOSE 8080

# Keep Java heap constrained to 380m to operate safely within 512 MB memory limits
ENTRYPOINT ["sh", "-c", "java -Xmx380m -Dserver.port=${PORT:-8080} -jar app.jar"]
