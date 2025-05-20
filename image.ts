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

const convertDateToCorrectFormat = (date: Date) => {
	let amPM = "am";
	let hours = date.getHours();

	if (hours > 12) {
		amPM = "pm";
		hours = date.getHours() - 12;
	} else if (date.getHours() == 0) {
		hours = 12;
	}

	return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${date.getMinutes().toString().padStart(2, "0")}${amPM}`;
};

export function drawIcon(data: {
	type: "train";
	line: keyof typeof COLORS;
}): EmulatedCanvas2D;
export function drawIcon(data: { type: "bus"; line: string }): EmulatedCanvas2D;
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
				: (stationToAbbreviation[name!] ?? name?.substring(0, 3));
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

	return canvas;
}

export const generateAlertImage = async (
	text: keyof typeof RouteStatusToColor,
	eventStart: string = "2025-05-02T22:37:00",
	eventEnd?: string
) => {
	// Top Bar
	const titleBar = createCanvas(1200, 176);
	const titleBarCtx = titleBar.getContext("2d");

	titleBarCtx.fillStyle = RouteStatusToColor[text];
	titleBarCtx.fillRect(0, 0, titleBar.width, titleBar.height);
	titleBarCtx.font = "bold 70px sans-serif";
	titleBarCtx.fillStyle = "white";
	titleBarCtx.textAlign = "right";

	const textWidth = 1200 - 400 - margin;
	const length = titleBarCtx.measureText(text).width;

	if (length >= textWidth) {
		const words = text.split(/ /g);

		for (let i = 0; i < words.length; i++) {
			const word = words[i];
			if (word.startsWith("w/")) {
				words[i - 1] += " with";
				words[i] = word.substring(2);
			}
		}

		titleBarCtx.font = "bold 60px sans-serif";
		const lines = [
			words.slice(0, Math.ceil(words.length / 2)).join(" "),
			words.slice(Math.ceil(words.length / 2)).join(" "),
		];
		titleBarCtx.fillText(lines[0], margin, 75);
		titleBarCtx.fillText(lines[1], margin, titleBar.height / 2 + 60);
	} else {
		titleBarCtx.fillText(text, margin, titleBar.height / 2 + 25);
	}

	const iconsCanvas = createCanvas(400, titleBar.height);
	const iconsCtx = iconsCanvas.getContext("2d");

	const icons = [
		drawIcon({ type: "train", line: "RED" }),
		drawIcon({ type: "train", line: "BROWN" }),
		drawIcon({ type: "train", line: "GREEN" }),
		drawIcon({ type: "train", line: "PINK" }),
		drawIcon({ type: "train", line: "ORANGE" }),
		drawIcon({ type: "train", line: "PURPLE" }),
		drawIcon({ type: "platform", line: "BLUE", name: "O'HARE" }),
		drawIcon({ type: "train", line: "YELLOW" }),
	].slice(0, Math.floor(Math.random() * 8) + 1);

	const iconSize = 128;

	const lastIcon = icons.shift()!;
	iconsCtx.drawImage(
		lastIcon,
		iconsCanvas.width - margin - iconSize,
		iconsCanvas.height / 2 - iconSize / 2,
		iconSize,
		iconSize
	);

	const iconMargin = Math.min(
		iconSize + margin,
		(iconsCanvas.width - margin - iconSize) / icons.length
	);

	for (let i = 0; i < icons.length; i++) {
		const icon = icons[i];
		const x = (i + 1) * iconMargin;
		iconsCtx.drawImage(
			icon,
			iconsCanvas.width - margin - iconSize - x,
			iconsCanvas.height / 2 - iconSize / 2,
			iconSize,
			iconSize
		);
	}

	titleBarCtx.drawImage(
		iconsCanvas,
		titleBar.width - iconsCanvas.width,
		0,
		iconsCanvas.width,
		iconsCanvas.height
	);

	// Bottom Bar

	const bottomBar = createCanvas(1200, 100);
	const bottomBarCtx = bottomBar.getContext("2d");

	const eventStartText =
		eventStart == null
			? "TBD"
			: convertDateToCorrectFormat(new Date(eventStart));
	let eventEndText =
		eventEnd == null ? "TBD" : convertDateToCorrectFormat(new Date(eventEnd));

	if (eventEnd != undefined && eventStart != undefined) {
		const [startDate] = eventStartText.split(" ");
		const [endDate, ...rest] = eventEndText.split(" ");

		if (startDate == endDate) {
			eventEndText = rest.join(" ");
		}
	}

	bottomBarCtx.fillStyle = "#000000";
	bottomBarCtx.fillRect(0, 0, bottomBar.width, bottomBar.height);
	bottomBarCtx.fillStyle = "white";
	bottomBarCtx.font = "bold 40px sans-serif";
	bottomBarCtx.textAlign = "left";
	bottomBarCtx.fillText(
		`Service Affected ${eventStartText} - ${eventEndText}`,
		margin,
		bottomBar.height / 2 + 15
	);

	// Center Content	
	const centerCanvas = createCanvas(1200, 800);

	// Final Canvas

	const finalCanvas = createCanvas(
		1200,
		titleBar.height + centerCanvas.height + bottomBar.height
	);
	const finalCtx = finalCanvas.getContext("2d");
	finalCtx.fillStyle = "#FFFFFF";
	finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

	finalCtx.drawImage(titleBar, 0, 0, titleBar.width, titleBar.height);

	finalCtx.drawImage(
		centerCanvas,
		0,
		titleBar.height,
		centerCanvas.width,
		centerCanvas.height
	);

	finalCtx.drawImage(
		bottomBar,
		0,
		finalCanvas.height - bottomBar.height,
		bottomBar.width,
		bottomBar.height
	);

	return await finalCanvas.toBuffer("image/png");
};

await Deno.writeFile(
	"./assets/out.png",
	await generateAlertImage(
		"Service Disruption",
		"2025-05-02T22:37:00",
		"2025-05-05T22:38:00"
	)
);
