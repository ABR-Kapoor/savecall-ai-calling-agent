import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
//#region src/routes/_authenticated/onboarding.tsx
var $$splitComponentImporter = () => import("./onboarding--OG-Gn3k.js");
var Route = createFileRoute("/_authenticated/onboarding")({
	head: () => ({ meta: [{ title: "Guided Setup: InsurCall AI Voice Employee" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var INTERVIEW_QUESTIONS = [
	{
		id: 0,
		question: "What is your company name, and what core insurance services or products do you provide?",
		field: "businessDescription",
		hint: "Speak or type your business focus (e.g. 'We are Apex Health Partners, providing health insurance and cashless claim assistance.')",
		example: "We run a health & motor insurance agency helping individuals and families with policy issuance and cashless claims."
	},
	{
		id: 1,
		question: "How would you like your receptionist to introduce itself when a customer calls?",
		field: "greeting",
		hint: "Your receptionist's opening sentence (e.g. 'Hello, welcome to Apex Health. I am Anya, how can I help you?')",
		example: "Hello! Welcome to our office. I am Anya, your AI receptionist. How can I help you today?"
	},
	{
		id: 2,
		question: "What language and tone should your receptionist use with customers?",
		field: "languageTone",
		hint: "e.g. 'Empathetic and professional in Hinglish and English'",
		example: "Warm and professional, speaking fluent Hinglish and English."
	},
	{
		id: 3,
		question: "When a customer has an emergency or complex dispute, when should a human staff member take over?",
		field: "escalation",
		hint: "Define your team's escalation boundary",
		example: "Immediately transfer complex claim disputes or emergency hospitalization cases to our claims desk."
	},
	{
		id: 4,
		question: "What critical company rules, limitations, or coverage facts must the receptionist NEVER invent?",
		field: "neverInvent",
		hint: "Explicit boundaries (e.g. Never guarantee claim payout without adjuster approval; pre-existing waiting period is 24 months)",
		example: "Never guarantee claim approval or promise payment amounts over the phone. Direct claim approval requires adjuster sign-off."
	}
];
//#endregion
export { Route as n, INTERVIEW_QUESTIONS as t };
