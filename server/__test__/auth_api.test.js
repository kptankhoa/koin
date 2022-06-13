const createServer = require("../src/utils/server.util");
const supertest = require("supertest");
const p2p = require("../src/controller/p2p");

const app = createServer();
const request = supertest(app);

const validSignUpResponseBody = (body) => {
  const keys = Object.keys(body);
  return keys.includes("privateKey") && keys.includes("publicKey");
};

const validSignInResponseBody = (body) => {
  const keys = Object.keys(body);
  return keys.includes("balance") && keys.includes("publicKey");
};


describe("test auth apis", () => {
  beforeAll(() => {
    p2p.initP2PServer(4599);
  });

  afterAll(() => {
    p2p.closeServer();
  });
  let privateKey;

  describe("POST /auth/signup", () => {
    it("should be 200", async () => {
      await request.post("/auth/signup").expect(200);
    });

    it("should have valid keys", async () => {
      const { body } = await request.post("/auth/signup");
      privateKey = body.privateKey;
      expect(validSignUpResponseBody(body)).toBe(true);
    });
  });

  describe("POST /auth/signin", () => {
    it("should be 400 (empty body)", async () => {
      await request.post("/auth/signin").expect(400);
    });

    it("should be 400 (wrong key)", async () => {
      const { body } = await request
        .post("/auth/signin")
        .send({ privateKey: "abcde" });
      expect(body.error_message).toEqual("Key not found!");
    });

    it("should be 200", async () => {
      await request.post("/auth/signin").send({ privateKey }).expect(200);
    });

    it("should have valid keys", async () => {
      const { body } = await request.post("/auth/signin").send({ privateKey });
      expect(validSignInResponseBody(body)).toBe(true);
    });
  });
});
