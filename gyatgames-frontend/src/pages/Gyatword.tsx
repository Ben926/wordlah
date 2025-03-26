import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    CrosswordGrid,
    CrosswordProvider,
    CrosswordProviderImperative,
    CrosswordProviderProps,
    DirectionClues,
    ThemeProvider,
} from "@jaredreisinger/react-crossword";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    //DropdownMenuLabel,
    //DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import PopupCorrect from "@/components/PopupCorrect";
import PopupWrong from "@/components/PopupWrong";
import Stopwatch, { StopwatchRef } from "@/components/Stopwatch";
import { timer } from "@/components/timer";
import { useCrosswordData } from "@/context/CrosswordDataContext";
import { buttonVariants } from "@/components/ui/button";
import { submitTiming, useDarkMode } from "@/lib/utils";
import { lightTheme, darkTheme } from "@/lib/utils";
import MobileClueDisplay from "@/components/MobileClueDisplay";
import { useIsMobile } from "@/lib/utils";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import FillSelectedAnswer from "@/components/FillSelectedAnswer";
import PopupHelp from "@/components/PopupHelp";
import FillSelectedCell from "@/components/FillSelectedCell";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { PopInfo } from "@/components/PopupInfo";

export const Gyatword = () => {
    const crosswordProvider = useRef<CrosswordProviderImperative>(null);
    const pageTimer = useRef<ReturnType<typeof timer> | null>(null);
    const [isRunning, setIsRunning] = useState(true);
    const [usedReveal, setUsedReveal] = useState(false);
    const [cellHintCount, setCellHintCount] = useState(0);
    const [wordHintCount, setWordHintCount] = useState(0);
    const { data, loading, error } = useCrosswordData();
    const isDarkMode = useDarkMode();
    const isMobile = useIsMobile();
    const theme = isDarkMode ? darkTheme : lightTheme;
    const { isAuthenticated, user } = useAuth(); // Get user authentication status
    const stopwatchRef = useRef<StopwatchRef>(null);



    // hide native keyboard on mobile
    useEffect(() => {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;

        if (isMobile) {
            // Ensure the effect runs after the crossword grid has rendered
            const inputElement = document.querySelector('input[aria-label="crossword-input"]');
            if (inputElement) {
                inputElement.setAttribute("readOnly", "true"); // Make the input read-only
                inputElement.setAttribute("display", "none"); // Make the input read-only

            }
        }
    }, []); // Empty dependency array ensures this runs once after mount

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const inputElement = document.querySelector('input[aria-label="crossword-input"]');
            if (inputElement) {
                inputElement.setAttribute("readOnly", "true");
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, []);

    // fill all answers prop
    const fillAllAnswersProvider = useCallback<React.MouseEventHandler>(
        (_event) => {
            setUsedReveal(true); // Mark that the "Reveal" button was used
            crosswordProvider.current?.fillAllAnswers();
        },
        []
    );

    // reset prop
    const resetProvider = useCallback<React.MouseEventHandler>((_event) => {
        crosswordProvider.current?.reset();
    }, []);



    const onCrosswordCompleteProvider = useCallback<
        Required<CrosswordProviderProps>["onCrosswordComplete"]
    >(
        async (isCorrect: any) => {
            if (isCorrect) {
                if (pageTimer.current) {
                    setIsRunning(false);

                    const numericString = pageTimer.current.seconds.replace(/\D/g, "");
                    const totalSeconds = Number(numericString);

                    if (isNaN(totalSeconds)) {
                        console.error("Expected a numeric value for seconds, got:", pageTimer.current.seconds);
                        return;
                    }

                    const timing = totalSeconds + (cellHintCount * 20) + (wordHintCount * 60);

                    const minutes = Math.floor(timing / 60);
                    const seconds = (timing % 60) - 1 < 10 ? `0${(timing % 60) - 1}` : (timing % 60) - 1;

                    const timeString = `${String(minutes).trim()}:${String(seconds).trim()}`;

                    const hintCount = cellHintCount + wordHintCount;

                    console.log("Elapsed time when completed:", totalSeconds);
                    console.log("Final hint count:", hintCount); // Log the final hint count here

                    if (usedReveal) {
                        PopupHelp("You used the Reveal button, better luck tomorrow!");
                    } else {
                        PopupCorrect(
                            hintCount > 0
                                ? `You completed the Gyatword in ` + `${timeString}`.bold() + ` with ${hintCount} hint${hintCount !== 1 ? "s" : ""}!`
                                : `You completed the Gyatword in ${timeString}!`
                        );
                    }
                    // ✅ Submit timing only if the user is logged in
                    if (isAuthenticated && user && !usedReveal) {
                        try {
                            await submitTiming(user.id, timing);
                            console.log("✅ Timing submitted successfully!");
                        } catch (error) {
                            console.error("❌ Failed to submit time:", error);
                        }
                    } else {
                        console.log("⚠️ User is not logged in, skipping timing submission.");
                    }
                }
            } else {
                PopupWrong();
            }
        },
        [usedReveal, cellHintCount, wordHintCount]
    );

    // Log the data to the console
    useEffect(() => {
        console.log('Crossword data retrieved from context:', data);
    }, [data]);


    // Start timer on page load
    useEffect(() => {
        if (!pageTimer.current) {
            pageTimer.current = timer();
            console.log("Page timer started");
        }

        // Cleanup logic for HMR
        return () => {
            console.log("Cleaning up timer due to HMR");
            pageTimer.current = null;
        };
    }, []);


    if (loading) {
        return (
            <div className="flex flex-col h-screen-minus-57 items-center justify-center">
                <LoadingSpinner />
            </div>
        )

    }

    if (error) {
        return <p>Error loading data: {error}</p>;
    }

    return (
        <ThemeProvider
            theme={theme}
        >
            <CrosswordProvider
                ref={crosswordProvider}
                data={data}
                onCrosswordComplete={onCrosswordCompleteProvider}
                useStorage={false}
            >
                <div className="w-screen h-fit max-h-screen-minus-57 no-scrollbar overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex flex-row gap-x-20 items-center mx-auto text-4xl justify-center py-0.5 md:py-2 bg-background border-b-2">
                        <Stopwatch
                            ref={stopwatchRef}
                            running={isRunning}
                            onComplete={(elapsedTime) =>
                                console.log(`Elapsed Time: ${elapsedTime}`)
                            }
                        />
                        <a
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={resetProvider}
                            className={`cursor-pointer h-6 md:h-10 md:text-sm w-16 ${buttonVariants({
                                variant: "destructive",
                            })}`
                            }
                        >
                            Reset
                        </a>

                        <DropdownMenu>
                            <DropdownMenuTrigger
                                className={`cursor-pointer h-6 md:h-10 md:text-sm w-16 ${buttonVariants({
                                    variant: "outline",
                                })}`}
                            >
                                Reveal
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <FillSelectedCell
                                    crosswordProvider={crosswordProvider}
                                    onHintUsed={() => {
                                        console.log("Previous hint count:", cellHintCount);
                                        setCellHintCount((prev) => {
                                            console.log("Incrementing hint count:", prev + 1);
                                            return prev + 1;
                                        });
                                        // ✅ Increment stopwatch by 20s when hint is used
                                        if (stopwatchRef.current) {
                                            stopwatchRef.current.addTime(20);
                                            console.log("✅ Stopwatch incremented by 20s");
                                        }
                                    }}
                                />
                                <FillSelectedAnswer
                                    crosswordProvider={crosswordProvider}
                                    onHintUsed={() => {
                                        console.log("Previous hint count:", wordHintCount);
                                        setWordHintCount((prev) => {
                                            console.log("Incrementing hint count:", prev + 1);
                                            return prev + 1;
                                        });
                                        // ✅ Increment stopwatch by 60s when hint is used

                                        if (stopwatchRef.current) {
                                            stopwatchRef.current.addTime(60);
                                            console.log("✅ Stopwatch incremented by 60s");
                                        }
                                    }}
                                />

                                <DropdownMenuItem
                                    onClick={fillAllAnswersProvider}
                                >
                                    Puzzle
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <PopInfo /> {/* 📌 Info button */}

                    </div>
                    <div className="flex flex-col w-full md:gap-5 md:flex-row max-h-fit lg:px-16 md:px-8">
                        <div className="w-full max-w-2xl items-center justify-center mx-auto">
                            <CrosswordGrid />
                        </div>

                        {isMobile ? (
                            <MobileClueDisplay />
                        ) : (
                            <div className="h-fit max-h-grid overflow-scroll flex flex-col gap-y-5 bg-secondary px-4 md:px-1 border-4 text-4xl">
                                <DirectionClues
                                    direction="across"
                                    className="clue correct"
                                    //@ts-ignore
                                    label={<span className="font-bold">ACROSS</span>} // Apply bold styling
                                />
                                <DirectionClues
                                    direction="down"
                                    className="clue correct"
                                    //@ts-ignore
                                    label={<span className="font-bold">DOWN</span>} // Apply bold styling

                                />
                            </div>
                        )}
                        {isMobile && (
                            <VirtualKeyboard />
                        )}

                    </div>
                </div >
            </CrosswordProvider>
        </ThemeProvider>
    );
}
