import {
	ScaleHighlight,
	ToneColorType,
	ToneValue,
	getToneBgColor,
	midiToToneValue,
	mod,
} from '@/utils/tone-colors'
import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as Tone from 'tone'
import { Popover } from '@headlessui/react'
import { ChartBarIcon } from '@heroicons/react/20/solid'
import {
	ArrowSmallDownIcon,
	ArrowSmallLeftIcon,
	ArrowSmallRightIcon,
	ArrowSmallUpIcon,
} from '@heroicons/react/24/outline'
import { IconButton } from './buttons'

type Mode = 'Record' | 'Play'

export interface KeyboardSettings {
	baseNote: number
	mode: Mode
	offsetX: number
	offsetY: number
	maxRows: number
	maxCols: number
	keyLength: number
	scaleHighlight: ScaleHighlight
	toneColorType: ToneColorType
}

interface KeyboardProps {
	activeNotes?: number[]
	settings: Partial<KeyboardSettings>
	onNoteActivated?: (midi: number) => void
	onNoteDeactivated?: (midi: number) => void
	onSettingsChanged?: (updatedSettings: KeyboardSettings) => void
	className?: string
}

const keyMargin = 3

const defaultSettings: KeyboardSettings = {
	baseNote: 48, // 'C3 midi number'
	offsetX: 0,
	offsetY: 0,
	maxCols: 13,
	maxRows: 13,
	keyLength: 60,
	mode: 'Record',
	scaleHighlight: ScaleHighlight.Major,
	toneColorType: ToneColorType.CircleOfFiths,
} as const

export const Keyboard: React.FC<KeyboardProps> = ({
	activeNotes = [],
	onNoteActivated = () => {},
	onNoteDeactivated = () => {},
	onSettingsChanged,
	className,
	settings,
}: KeyboardProps) => {
	const currentSettings: KeyboardSettings = { ...defaultSettings, ...settings }
	const {
		keyLength,
		baseNote,
		maxCols,
		maxRows,
		mode,
		offsetX,
		offsetY,
		scaleHighlight,
		toneColorType,
	} = currentSettings

	const keySize = keyLength + 2 * keyMargin

	const [pointerDown, setPointerDown] = useState(false)
	const wrapperRef = useRef<HTMLDivElement>(null)

	const baseFrequency = useMemo(
		() => Tone.Frequency(baseNote, 'midi'),
		[baseNote],
	)

	const notes = useMemo(() => {
		return activeNotes.reduce((acc, note) => {
			acc[note] = true
			return acc
		}, {} as Record<number, boolean>)
	}, [activeNotes])

	const toneBg = (tone: ToneValue) =>
		getToneBgColor(
			tone,
			midiToToneValue(baseNote),
			scaleHighlight,
			toneColorType,
		)

	const onPointerDown = (midi: number) => {
		setPointerDown(true)
		if (mode === 'Record') {
			if (notes[midi]) {
				onNoteDeactivated(midi)
			} else {
				onNoteActivated(midi)
			}
		} else {
			onNoteActivated(midi)
		}
	}

	const onPointerUp = (midi: number) => {
		setPointerDown(false)
		if (mode === 'Play') {
			onNoteDeactivated(midi)
		}
	}

	const onPointerEnter = (midi: number) => {
		if (pointerDown) {
			if (mode === 'Record') {
				if (notes[midi]) {
					onNoteDeactivated(midi)
				} else {
					onNoteActivated(midi)
				}
			} else {
				onNoteActivated(midi)
			}
		}
	}

	const onPointerOut = (midi: number) => {
		if (pointerDown) {
			if (mode === 'Play') {
				onNoteDeactivated(midi)
			}
		}
	}

	const stopPreventAnd = (fn: () => void) => (e: React.BaseSyntheticEvent) => {
		e.preventDefault()
		e.stopPropagation()
		fn()
		return false
	}

	const preventAnd = (fn: () => void) => (e: React.BaseSyntheticEvent) => {
		e.preventDefault()
		fn()
	}

	// compute the keys

	const [width, setWidth] = useState(maxCols)
	const [height, setHeight] = useState(maxRows)

	useEffect(() => {
		function rescale() {
			if (wrapperRef.current) {
				const { width: boxWidth, height: boxHeight } =
					wrapperRef.current.getBoundingClientRect()
				console.log(
					boxHeight,
					wrapperRef.current.clientHeight,
					wrapperRef.current.offsetHeight,
				)
				const cols = Math.min(
					Math.floor((boxWidth - 2 * keyMargin) / keySize),
					maxCols,
				)
				const rows = Math.min(
					Math.floor((boxHeight - 2 * keyMargin) / keySize),
					maxRows,
				)
				setWidth(cols)
				setHeight(rows)
			}
		}

		rescale()

		window.addEventListener('resize', rescale)
		return () => window.removeEventListener('resize', rescale)
	}, [keySize, maxCols, maxRows])

	const base = baseFrequency.transpose(-2 + offsetX + (-2 + offsetY) * 5)
	const keys = []
	let rowStart = 0

	for (let i = 0; i < height; i++) {
		const row = []

		for (let j = 0; j < width; j++) {
			const val = rowStart + j
			const f = base.transpose(val)
			const midi = f.toMidi()
			row.push({
				frequency: f,
				midi,
				toneColor: mod(midi, 12) as ToneValue,
			})
		}

		keys.push(row)
		rowStart += 5
	}

	keys.reverse()

	return (
		<div
			ref={wrapperRef}
			className={clsx(
				className,
				'relative flex max-h-full max-w-full items-center justify-evenly overflow-hidden',
			)}
			style={{
				height: `${maxRows * keySize + 2 * keyMargin}px`,
				width: `${maxCols * keySize + 2 * keyMargin}px`,
			}}
		>
			{onSettingsChanged && (
				<Popover className="absolute right-0 top-0">
					<Popover.Button type="button" className="m-0">
						<ChartBarIcon className="h-6 w-6 -rotate-90" />
					</Popover.Button>
					<Popover.Panel className="absolute right-8 top-1 rounded bg-gray-100/90 shadow-lg shadow-gray-400">
						<div className="flex">
							<IconButton
								className="m-3 p-1"
								onClick={() => {
									onSettingsChanged({
										...currentSettings,
										offsetX: offsetX - 1,
									})
								}}
							>
								<ArrowSmallLeftIcon className="h-6 w-6" />
							</IconButton>
							<IconButton
								className="m-3 p-1"
								onClick={() => {
									onSettingsChanged({
										...currentSettings,
										offsetY: offsetY + 1,
									})
								}}
							>
								<ArrowSmallUpIcon className="h-6 w-6" />
							</IconButton>
							<IconButton
								className="m-3 p-1"
								onClick={() => {
									onSettingsChanged({
										...currentSettings,
										offsetY: offsetY - 1,
									})
								}}
							>
								<ArrowSmallDownIcon className="h-6 w-6" />
							</IconButton>
							<IconButton
								className="m-3 p-1"
								onClick={() => {
									onSettingsChanged({
										...currentSettings,
										offsetX: offsetX + 1,
									})
								}}
							>
								<ArrowSmallRightIcon className="h-6 w-6" />
							</IconButton>
						</div>
					</Popover.Panel>
				</Popover>
			)}

			<div className="flex h-full w-full flex-col justify-evenly">
				{keys.map((row, i) => (
					<div
						key={i}
						className="flex w-full touch-none justify-evenly whitespace-nowrap"
					>
						{row.map((cell, j) => (
							<button
								className={clsx(
									'box-border touch-none select-none rounded-md text-gray-700 shadow-sm',
									{ 'border-4 border-red-400': notes[cell.midi] },
								)}
								style={{
									backgroundColor: toneBg(cell.toneColor),
									width: `${keyLength}px`,
									height: `${keyLength}px`,
									margin: `${keyMargin}px`,
								}}
								key={j}
								onPointerDown={preventAnd(() => onPointerDown(cell.midi))}
								onPointerUp={preventAnd(() => onPointerUp(cell.midi))}
								onPointerEnter={preventAnd(() => onPointerEnter(cell.midi))}
								onPointerOut={preventAnd(() => onPointerOut(cell.midi))}
								onContextMenu={stopPreventAnd(() => {})}
							>
								{cell.frequency.toNote()}
							</button>
						))}
					</div>
				))}
			</div>
		</div>
	)
}
