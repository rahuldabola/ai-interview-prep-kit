import mongoose, { Schema, type InferSchemaType } from "mongoose";

const progressEventSchema = new Schema(
  {
    step: String,
    status: { type: String, enum: ["started", "done", "skipped", "error"] },
    message: String,
    at: String,
  },
  { _id: false }
);

const practiceAttemptSchema = new Schema(
  {
    flashcard_id: { type: String, required: true },
    confidence: { type: Number, min: 1, max: 5, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const kitDocSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["draft", "generating", "ready", "failed"],
      default: "draft",
      required: true,
    },
    input: {
      jd: { type: String, required: true },
      company_url: { type: String, required: true },
      days: { type: Number, required: true },
    },
    dedupeHash: { type: String, required: true, index: true },
    kit: { type: Schema.Types.Mixed, default: null },
    progress: { type: [progressEventSchema], default: [] },
    skipped: { type: [{ url: String, reason: String }], default: [] },
    error: {
      type: new Schema({ code: String, message: String }, { _id: false }),
      default: null,
    },
    practiceAttempts: { type: [practiceAttemptSchema], default: [] },
  },
  { timestamps: true }
);

kitDocSchema.index({ userId: 1, dedupeHash: 1 });

export type KitDoc = InferSchemaType<typeof kitDocSchema> & { _id: mongoose.Types.ObjectId };

export const KitModel = mongoose.model("Kit", kitDocSchema);
