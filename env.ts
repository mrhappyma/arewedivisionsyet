import { z } from "zod";

const envSchema = z.object({
  username: z.string(),
  token: z.string(),
});
export default envSchema.parse(process.env);
