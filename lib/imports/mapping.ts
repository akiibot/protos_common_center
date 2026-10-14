import { z } from "zod";
import { transformNameSchema } from "./normalization.ts";

export const importEntityTypes = ["member", "goal", "project", "task", "lead", "content", "finance"] as const;

const handlingSchema = z.enum(["import", "derive", "archive", "omit"]);
const sensitivitySchema = z.enum(["public", "internal", "confidential", "restricted"]);
const entityTypeSchema = z.enum(importEntityTypes);

const fieldMappingSchema = z.object({
  sourceSheet: z.string().min(1),
  sourceHeader: z.string().min(1),
  handling: handlingSchema,
  targetEntity: entityTypeSchema.nullable(),
  targetField: z.string().min(1).nullable(),
  transform: transformNameSchema,
  required: z.boolean(),
  default: z.unknown().optional(),
  valueMap: z.record(z.string(), z.string()).default({}),
  sensitivity: sensitivitySchema,
  decision: z.object({
    status: z.enum(["approved", "open"]),
    rationale: z.string().min(1),
    approvedBy: z.string().min(1).nullable(),
  }),
});

const entityMappingSchema = z.object({
  entityType: entityTypeSchema,
  sourceSheet: z.string().min(1),
  sourceKeyFields: z.array(z.string().min(1)).min(1),
  applyOrder: z.number().int().nonnegative(),
  parentEntityTypes: z.array(entityTypeSchema).default([]),
  existingTargetPolicy: z.enum(["create_only", "explicit_link"]),
  reconciliation: z.object({
    count: z.boolean(),
    moneyFields: z.array(z.string().min(1)).default([]),
  }),
});

export const importMappingSchema = z.object({
  mappingVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: z.enum(["draft", "approved"]),
  sourceNamespace: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  approvedAt: z.string().datetime().nullable(),
  approvedBy: z.string().min(1).nullable(),
  blockingDecisions: z.array(z.string().min(1)),
  entityMappings: z.array(entityMappingSchema),
  fieldMappings: z.array(fieldMappingSchema),
}).superRefine((mapping, context) => {
  const entityKeys = new Set<string>();
  for (const entity of mapping.entityMappings) {
    const key = `${entity.sourceSheet}\u0000${entity.entityType}`;
    if (entityKeys.has(key)) {
      context.addIssue({ code: "custom", path: ["entityMappings"], message: `Duplicate entity mapping: ${entity.sourceSheet}/${entity.entityType}` });
    }
    entityKeys.add(key);
  }

  const fieldKeys = new Set<string>();
  for (const field of mapping.fieldMappings) {
    const key = `${field.sourceSheet}\u0000${field.sourceHeader}`;
    if (fieldKeys.has(key)) {
      context.addIssue({ code: "custom", path: ["fieldMappings"], message: `Duplicate field mapping: ${field.sourceSheet}/${field.sourceHeader}` });
    }
    fieldKeys.add(key);

    if (field.handling === "import" && (!field.targetEntity || !field.targetField)) {
      context.addIssue({ code: "custom", path: ["fieldMappings"], message: `Imported field requires a target: ${field.sourceSheet}/${field.sourceHeader}` });
    }
    if (field.handling === "omit" && (field.targetEntity || field.targetField)) {
      context.addIssue({ code: "custom", path: ["fieldMappings"], message: `Omitted field cannot have a target: ${field.sourceSheet}/${field.sourceHeader}` });
    }
  }
});

export type ImportMapping = z.infer<typeof importMappingSchema>;

export function assertMappingReady(mapping: ImportMapping) {
  const reasons: string[] = [];
  if (mapping.status !== "approved") reasons.push("mapping status is not approved");
  if (!mapping.sourceSha256) reasons.push("approved source fingerprint is missing");
  if (!mapping.approvedAt || !mapping.approvedBy) reasons.push("mapping approval metadata is incomplete");
  if (mapping.blockingDecisions.length > 0) reasons.push("blocking mapping decisions remain");
  if (mapping.entityMappings.length === 0) reasons.push("no entity mappings are defined");
  if (mapping.fieldMappings.length === 0) reasons.push("no field mappings are defined");
  if (mapping.fieldMappings.some((field) => field.decision.status !== "approved")) reasons.push("open field decisions remain");
  if (reasons.length > 0) throw new Error(`Import mapping is not ready: ${reasons.join("; ")}`);
}
