<template>
    <div class="container max-w-7xl">
        <div class="mb-8 flex items-start justify-between">
            <div>
                <h1 class="text-3xl font-bold mb-2">Pridanie Jedla</h1>
                <p class="text-gray-600">
                    Spravujte jedálny lístok pre každý deň v týždni
                </p>
            </div>
            <!-- Testing Features Button -->
            <UButton
                v-if="enableTestingFeatures"
                :loading="isFillingWeek"
                @click="handleFillTestWeek"
                color="neutral"
                size="md"
                icon="i-heroicons-sparkles"
                class="bg-orange text-dark-green hover:bg-dark-green hover:text-beige cursor-pointer"
            >
                Predvyplniť testovacie jedlá
            </UButton>
        </div>

        <div class="space-y-8">
            <!-- Week Navigator -->
            <MealsWeekNavigator
                :current-monday="currentMonday"
                @update:current-monday="handleWeekChange"
            />

            <!-- Loading State -->
            <div v-if="isLoading" class="flex justify-center py-12">
                <UIcon
                    name="i-heroicons-arrow-path"
                    class="w-8 h-8 animate-spin text-[var(--color-orange)]"
                />
            </div>

            <!-- Days Grid (All 7 days in one row) -->
            <div v-else class="grid grid-cols-3 md:grid-cols-7 gap-2">
                <UCard
                    v-for="(day, index) in daysOfWeek"
                    :key="day.dateStr"
                    class="cursor-pointer hover:ring-2 hover:ring-orange transition-all px-0 py-0"
                    :class="[
                        selectedDate === day.dateStr
                            ? 'bg-[var(--color-orange)] text-[var(--color-beige)]'
                            : '',
                    ]"
                    @click="handleDayClick(day.dateStr)"
                >
                    <div class="flex flex-col items-center gap-1">
                        <div class="flex items-center justify-between w-full">
                            <span
                                class="text-sm font-medium"
                                :class="
                                    selectedDate === day.dateStr
                                        ? 'text-[var(--color-beige)]'
                                        : 'text-gray-600'
                                "
                            >
                                {{ day.shortName }}
                            </span>
                            <UIcon
                                v-if="dailyMealsCache[day.dateStr]?.isPublished"
                                name="i-heroicons-check-circle-solid"
                                class="w-4 h-4"
                                :class="
                                    selectedDate === day.dateStr
                                        ? 'text-[var(--color-beige)]'
                                        : 'text-green-500'
                                "
                            />
                        </div>
                        <div class="text-center">
                            <p
                                class="text-xl font-bold"
                                :class="
                                    selectedDate === day.dateStr
                                        ? 'text-[var(--color-beige)]'
                                        : 'text-gray-900'
                                "
                            >
                                {{ day.dayNumber }}
                            </p>
                            <p
                                class="text-xs"
                                :class="
                                    selectedDate === day.dateStr
                                        ? 'text-[var(--color-beige)]'
                                        : 'text-gray-500'
                                "
                            >
                                {{ day.monthName }}
                            </p>
                        </div>
                    </div>
                </UCard>

                <!-- Sunday (Disabled) -->
                <UCard class="opacity-50 cursor-not-allowed p-2">
                    <div class="flex flex-col items-center gap-1">
                        <span class="text-sm font-medium text-gray-400"
                            >Ne</span
                        >
                        <div class="text-center">
                            <p class="text-xl font-bold text-gray-400">
                                {{ sundayDate.getDate() }}
                            </p>
                            <p class="text-xs text-gray-400">
                                {{ getSundayMonth() }}
                            </p>
                        </div>
                    </div>
                </UCard>
            </div>

            <!-- Meal Editor Form (shown when day is selected) -->
            <div v-if="selectedDate && !isLoading" class="w-full">
                <UCard>
                    <div v-if="isLoadingDay" class="flex justify-center py-12">
                        <UIcon
                            name="i-heroicons-arrow-path"
                            class="w-8 h-8 animate-spin text-[var(--color-orange)]"
                        />
                    </div>
                    <MealsDailyMealEditorForm
                        v-else
                        :date="selectedDate"
                        :initial-data="selectedDayData"
                        @save="handleMealsSave"
                        @cancel="handleCancelEdit"
                    />
                </UCard>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DailyMeal } from "~/lib/types/meals";

definePageMeta({
    layout: "dashboard",
});

const toast = useToast();
const config = useRuntimeConfig();

// State
const currentMonday = ref<Date>(getMondayOfCurrentWeek());
const selectedDate = ref<string | null>(null);
const isLoading = ref(false);
const isLoadingDay = ref(false);
const isSaving = ref(false);
const isFillingWeek = ref(false);
const enableTestingFeatures = computed(() => config.public.enableTestingFeatures ?? false);

// Test meal data for "Testovací týždeň" button
const TEST_MEALS_DATA = [
    {
        meals: {
            desiata: "Ovocný jogurt s granolou",
            polievka: "Kuracia vývarová polievka s rezancami",
            olovrant: "Proteínová tyčinka s mandelami",
            vecera: "Grilované kuracie prsia s cesnakom a bylinkami",
        },
        ranajkyOptions: {
            optionA: "Ovsená kaša s čerstvým ovocím a medom",
            optionB: "Praženica s celozrnným chlebom a zeleninou",
        },
        obedOptions: {
            optionA: "Grilované kuracie prsia s ryžou a dusenou zeleninou",
            optionB: "Losos na masle s petržlenovou zemiakovou kašou",
            optionC: "Zeleninové kari s quinoou a kokosovým mliekom",
        },
    },
    {
        meals: {
            desiata: "Cottage cheese s medom a orechmi",
            polievka: "Paradajková polievka s bazalkou",
            olovrant: "Jablko s arašidovým maslom",
            vecera: "Pečený losos s citrónom a špargľou",
        },
        ranajkyOptions: {
            optionA: "Jogurt s müsli a čerstvými bobuľami",
            optionB: "Celozrnné palacinky s javorovým sirupom",
        },
        obedOptions: {
            optionA: "Hovädzí steak s grilovanou zeleninou",
            optionB: "Morčacie prsia s bulgur šalátom",
            optionC: "Šošovicový šalát s balkánskym syrom",
        },
    },
    {
        meals: {
            desiata: "Banánový smoothie s proteínom",
            polievka: "Šošovicová polievka s mrkvou",
            olovrant: "Hummus s mrkvovými tyčinkami",
            vecera: "Tofu steak s brokolicou a sezamom",
        },
        ranajkyOptions: {
            optionA: "Avokádový toast s vajíčkom",
            optionB: "Smoothie bowl s ovocím a chia semienkami",
        },
        obedOptions: {
            optionA: "Kuracie soté so zeleninou a ryžovými rezancami",
            optionB: "Grilovaný halibut s citrusovou omáčkou",
            optionC: "Cícerový curry s jasmínovou ryžou",
        },
    },
    {
        meals: {
            desiata: "Grécky jogurt s vlašskými orechmi",
            polievka: "Zeleninový vývar s krupicovými haluškami",
            olovrant: "Tmavá čokoláda s mandlami",
            vecera: "Grilovaný králik s rozmarínovými zemiakmi",
        },
        ranajkyOptions: {
            optionA: "Vaječná omeleta so špenátom a feta syrom",
            optionB: "Chia puding s mangom a kokosom",
        },
        obedOptions: {
            optionA: "Bravčová panenka s dusenou kapustou",
            optionB: "Pstruh na masle s mandlami",
            optionC: "Quinoa bowl s pečenou zeleninou",
        },
    },
    {
        meals: {
            desiata: "Proteínový kokteil s banánom",
            polievka: "Hrachová krémová polievka",
            olovrant: "Ryžové chlebíčky s avokádom",
            vecera: "Kačacie prsia s pomarančovou omáčkou",
        },
        ranajkyOptions: {
            optionA: "Raňajkový burrito s fazuľou a vajíčkom",
            optionB: "Tvarohové lievance s lesným ovocím",
        },
        obedOptions: {
            optionA: "Jahňacie kotlety s mätovou omáčkou",
            optionB: "Tuniak steak s wasabi majonézou",
            optionC: "Falafel tanier s hummusom a tahinovou omáčkou",
        },
    },
    {
        meals: {
            desiata: "Ovocný šalát s mätou",
            polievka: "Brokolicová krémová polievka so syrom",
            olovrant: "Energetická guľôčka s datlami",
            vecera: "Grilované morské plody s cesnakovým maslom",
        },
        ranajkyOptions: {
            optionA: "Belgické wafle s čerstvým ovocím",
            optionB: "Škoricová ovsená kaša s jablkami",
        },
        obedOptions: {
            optionA: "Kuracie prsia plnené mozzarellou a špenátom",
            optionB: "Lososový burger s avokádovou majonézou",
            optionC: "Zeleninová lasagne s ricottou",
        },
    },
];

// Cache for daily meals data
const dailyMealsCache = ref<Record<string, DailyMeal | null>>({});

// Day names
const DAY_SHORT_NAMES = ["Po", "Ut", "St", "Št", "Pi", "So"];
const MONTH_SHORT_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Máj",
    "Jún",
    "Júl",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dec",
];

// Computed
const daysOfWeek = computed(() => {
    return DAY_SHORT_NAMES.map((shortName, index) => {
        const date = new Date(currentMonday.value);
        date.setDate(date.getDate() + index);
        return {
            shortName,
            dateStr: formatDateStr(date),
            dayNumber: date.getDate(),
            monthName: MONTH_SHORT_NAMES[date.getMonth()],
        };
    });
});

const sundayDate = computed(() => {
    const sunday = new Date(currentMonday.value);
    sunday.setDate(sunday.getDate() + 6);
    return sunday;
});

const selectedDayData = computed(() => {
    if (!selectedDate.value) return null;
    return dailyMealsCache.value[selectedDate.value] || null;
});

// Methods
function getMondayOfCurrentWeek(): Date {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function formatDateStr(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getSundayMonth(): string {
    return MONTH_SHORT_NAMES[sundayDate.value.getMonth()] || "";
}

async function fetchDayMeals(dateStr: string) {
    try {
        const response = await useAuthFetch(`/api/meals/daily/${dateStr}`);
        dailyMealsCache.value[dateStr] = response as DailyMeal;
    } catch (error) {
        console.error("Error fetching day meals:", error);
        dailyMealsCache.value[dateStr] = null;
    }
}

async function fetchWeekMeals() {
    isLoading.value = true;
    try {
        // Fetch all days in parallel
        const promises = daysOfWeek.value.map((day) =>
            fetchDayMeals(day.dateStr),
        );
        await Promise.all(promises);
    } catch (error) {
        console.error("Error fetching week meals:", error);
        toast.add({
            title: "Chyba",
            description: "Nepodarilo sa načítať jedálny lístok",
            color: "error",
        });
    } finally {
        isLoading.value = false;
    }
}

function handleWeekChange(newMonday: Date) {
    currentMonday.value = newMonday;
    selectedDate.value = null;
}

async function handleDayClick(dateStr: string) {
    selectedDate.value = dateStr;

    // Fetch fresh data for selected day
    if (!dailyMealsCache.value[dateStr]) {
        isLoadingDay.value = true;
        await fetchDayMeals(dateStr);
        isLoadingDay.value = false;
    }
}

function handleCancelEdit() {
    selectedDate.value = null;
}

async function handleMealsSave(formData: {
    meals: any;
    ranajkyOptions: any;
    obedOptions: any;
}) {
    if (!selectedDate.value) return;

    isSaving.value = true;
    try {
        const response = await useAuthFetch(
            `/api/meals/daily/${selectedDate.value}`,
            {
                method: "POST",
                body: formData,
            },
        );

        // Update cache with response
        const result = response as any;
        if (result.data) {
            dailyMealsCache.value[selectedDate.value] = result.data;
        }

        toast.add({
            title: "Úspech",
            description: result.isPublished
                ? "Jedlá boli uložené a publikované"
                : "Jedlá boli uložené ako koncept",
            color: "success",
        });

        // Stay on the same day to allow further editing
    } catch (error: any) {
        console.error("Error saving meals:", error);
        toast.add({
            title: "Chyba",
            description: error.data?.message || "Nepodarilo sa uložiť jedlá",
            color: "error",
        });
    } finally {
        isSaving.value = false;
    }
}

// Fill current week with test data (client-side only)
function handleFillTestWeek() {
    isFillingWeek.value = true;

    try {
        // Fill cache for each day of the week (Mon-Sat)
        daysOfWeek.value.forEach((day, index) => {
            const testData = TEST_MEALS_DATA[index % TEST_MEALS_DATA.length];
            dailyMealsCache.value[day.dateStr] = {
                date: day.dateStr,
                meals: { ...testData.meals },
                ranajkyOptions: { ...testData.ranajkyOptions },
                obedOptions: { ...testData.obedOptions },
                isPublished: false, // Not published until saved
                createdAt: new Date(),
                updatedAt: new Date(),
            } as DailyMeal;
        });

        toast.add({
            title: "Úspech",
            description: "Testovací týždeň bol vyplnený. Kliknite na deň a uložte jedlá.",
            color: "success",
        });

        // Select the first day to show the form
        if (daysOfWeek.value.length > 0) {
            selectedDate.value = daysOfWeek.value[0].dateStr;
        }
    } catch (error: any) {
        console.error("Error filling test week:", error);
        toast.add({
            title: "Chyba",
            description: "Nepodarilo sa vyplniť testovací týždeň",
            color: "error",
        });
    } finally {
        isFillingWeek.value = false;
    }
}

// Initial load - wait for auth to be ready
onMounted(async () => {
    const { isAuthenticated, loading: authLoading } = useAuth();

    // Wait for auth to initialize
    if (authLoading.value) {
        await new Promise<void>((resolve) => {
            const unwatch = watch(
                authLoading,
                (loading) => {
                    if (!loading) {
                        unwatch();
                        resolve();
                    }
                },
                { immediate: true },
            );
        });
    }

    // Only fetch data if authenticated
    if (isAuthenticated.value) {
        await fetchWeekMeals();
        // Auto-select first day
        if (daysOfWeek.value.length > 0) {
            selectedDate.value = daysOfWeek.value[0].dateStr;
        }
    }
});

// Watch for week changes
watch(
    () => currentMonday.value,
    async () => {
        await fetchWeekMeals();
        // Auto-select first day of new week
        if (daysOfWeek.value.length > 0) {
            selectedDate.value = daysOfWeek.value[0].dateStr;
        }
    },
);
</script>
