"use client";

type Props = {
  memberId: string;
  memberName: string;
  initial: unknown;
};

export function GoalWizard({ memberName }: Props) {
  return (
    <div className="max-w-3xl mx-auto p-8 font-sans">
      <h1 className="text-4xl" style={{ fontFamily: "var(--font-fraunces)" }}>
        Цель на 12 недель
      </h1>
      <p className="mt-2">Привет, {memberName}. Мастер будет тут.</p>
    </div>
  );
}
