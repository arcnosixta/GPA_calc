import type { Database } from "./database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type LetterGrade = Database["public"]["Enums"]["letter_grade"];
export type Tables<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Row"];
export type Insert<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Insert"];
export type Update<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Update"];
