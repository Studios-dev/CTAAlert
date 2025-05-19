import {
	type CanvasRenderingContext2D,
	createCanvas,
	EmulatedCanvas2D,
	loadImage,
} from "jsr:@gfx/canvas-wasm";
import { COLORS, RouteStatusToColor } from "./lib/colors.ts";
import { stationToAbbreviation } from "./lib/cta.ts";

const margin = 20;

const icons = {
	bus: await loadImage(await Deno.readFile("./assets/bus.png")),
	train: await loadImage(await Deno.readFile("./assets/train.png")),
	// TODO: Replace this with a dedicated icon
	platform: await loadImage(await Deno.readFile("./assets/train.png")),
};

// Thank you stack overflow https://stackoverflow.com/a/7838871
const roundRect = function (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
) {
	const prevFillStyle = ctx.fillStyle.toString();
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = "black";
	ctx.stroke();
	ctx.fillStyle = prevFillStyle;
};

export function drawIcon(data: {
	type: "train";
	line: keyof typeof COLORS;
}): EmulatedCanvas2D;
export function drawIcon(data: {
	type: "bus";
	line: string;
}): EmulatedCanvas2D;
export function drawIcon(data: {
	type: "platform";
	line: keyof typeof COLORS;
	name: keyof typeof stationToAbbreviation;
}): EmulatedCanvas2D;
export function drawIcon({
	type,
	line,
	name,
}: {
	type: "train" | "bus" | "platform";
	line: keyof typeof COLORS | string;
	/** Only set for platforms */
	name?: keyof typeof stationToAbbreviation;
}): EmulatedCanvas2D {
	const icon = icons[type as keyof typeof icons];
	const color =
		type == "bus" ? COLORS.GREY : COLORS[line as keyof typeof COLORS];
	const canvas = createCanvas(256, 256);
	const ctx = canvas.getContext("2d");

	ctx.fillStyle = "#000000";
	ctx.beginPath();
	ctx.arc(
		canvas.width / 2,
		canvas.height / 2,
		canvas.width / 2,
		0,
		Math.PI * 2
	);
	ctx.fill();
	ctx.closePath();

	ctx.fillStyle = color;

	ctx.beginPath();
	ctx.arc(
		canvas.width / 2,
		canvas.height / 2,
		canvas.width / 2 - 2,
		0,
		Math.PI * 2
	);
	ctx.fill();
	ctx.closePath();

	ctx.drawImage(
		icon,
		margin,
		margin,
		canvas.width - margin * 2,
		canvas.height - margin * 2
	);

	if (type != "train") {
		const text =
			type == "bus"
				? line
				: stationToAbbreviation[name!] ?? name?.substring(0, 3);
		ctx.font = "bold 60px sans-serif";
		const length = ctx.measureText(text.replace(/./g, "9")).width;
		const label = createCanvas(length + margin, 70);
		const labelCtx = label.getContext("2d");

		labelCtx.fillStyle = "#565a5c";
		roundRect(labelCtx, 0, 0, label.width, label.height, 10);

		labelCtx.fillStyle = "white";
		labelCtx.font = ctx.font;
		labelCtx.fillText(text, margin / 2, label.height / 2 + 22);

		ctx.drawImage(
			label,
			canvas.width / 2 - label.width / 2,
			canvas.height - label.height - margin
		);
	}

	return canvas
}

export const generateAlertImage = async () => {
	const titleBar = createCanvas(1200, 176);
	const titleBarCtx = titleBar.getContext("2d");

	titleBarCtx.font = "bold 100px sans-serif";
	titleBarCtx.fillStyle = RouteStatusToColor["Minor Delays"];
	titleBarCtx.fillRect(0, 0, titleBar.width, titleBar.height);
	titleBarCtx.fillStyle = "white";

	const text = "Planned Work w/Station(s) Bypassed";
	const length = titleBarCtx.measureText(text.replace(/./g, "9")).width;
	titleBarCtx.fillText(text, margin, titleBar.height / 2 + 36);

	const remainingWidth = titleBar.width - length - margin;
	const icons = [
		await drawIcon({ type: "train", line: "RED" }),
		await drawIcon({ type: "train", line: "BLUE" }),
		await drawIcon({ type: "train", line: "GREEN" }),
		await drawIcon({ type: "train", line: "PINK" }),
	];

	const iconSize = 100;

	// Draw all icons in the remaining space with them overlapping if needed
	for (let i = 0; i < icons.length; i++) {
		const icon = icons[i];
		const x = length + margin + remainingWidth / (icons.length + 1) * (i + 1) - iconSize / 2;
		const y = titleBar.height / 2 - iconSize / 2;

		titleBarCtx.drawImage(
			icon,
			x,
			y,
			iconSize,
			iconSize
		);
	}

	return await titleBar.toBuffer("image/png");
};

await Deno.writeFile("./assets/out.png", await generateAlertImage());
