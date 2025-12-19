"use client";

export default function ForbiddenBanner({ text }: { text?: string | null }) {
  if (!text) return null;

  return (
    <div
      style={{
        margin: "12px auto 0",
        maxWidth: 720,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #f5c2c7",
        background: "#f8d7da",
        color: "#842029",
        textAlign: "left",
        fontWeight: 600,
      }}
    >
      {text}
    </div>
  );
}