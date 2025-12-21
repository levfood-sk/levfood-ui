import { getFirebaseAdmin } from "~~/server/utils/firebase-admin";
import { requireAuth, handleApiError } from "~~/server/utils/auth";
import type { DailyMeal } from "~/lib/types/meals";

/**
 * POST /api/meals/seed
 * Seeder endpoint for development - fills next 14 days with test meal data
 * Only works when ENABLE_SEEDER=true
 */
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Check if seeder is enabled
    if (!config.public.enableSeeder) {
      throw createError({
        statusCode: 403,
        message: "Seeder je zakázaný",
      });
    }

    requireAuth(event);

    // Hardcoded meal data for 14 days
    const seedMeals = [
      {
        meals: {
          desiata: "Ovocný jogurt s granolou",
          polievka: "Kuracia vývarová polievka",
          olovrant: "Proteínová tyčinka s mandelami",
          vecera: "Grilované kuracie prsia s cesnakom",
        },
        ranajkyOptions: {
          optionA: "Ovsená kaša s ovocím a medom",
          optionB: "Praženica s celozrnným chlebom",
        },
        obedOptions: {
          optionA: "Grilované kuracie prsia s ryžou a zeleninou",
          optionB: "Losos na masle s petržlenovou zemiakovou kašou",
          optionC: "Zeleninové kari s quinoou",
        },
      },
      {
        meals: {
          desiata: "Chlieb s domácim maslom a džemom",
          polievka: "Zeleninová polievka so zemiakmi",
          olovrant: "Banán s arašidovým maslom",
          vecera: "Hovädzí guláš s domácimi rezancami",
        },
        ranajkyOptions: {
          optionA: "Palačinky so sladkou tvárogom",
          optionB: "Chlieb s maslom a medom",
        },
        obedOptions: {
          optionA: "Hovädzí guláš s rezancami",
          optionB: "Kuracie čalamáde s bramborami",
          optionC: "Zeleninové rizoto s parmezánom",
        },
      },
      {
        meals: {
          desiata: "Čokoládové mlieko s pareniekami",
          polievka: "Hrubá krupičná polievka",
          olovrant: "Zeleninový koktail",
          vecera: "Pečené zemiaky s cibuľou a bylinkami",
        },
        ranajkyOptions: {
          optionA: "Granola s grieckym jogurtom",
          optionB: "Chlieb s margarínom a sypanými orieškami",
        },
        obedOptions: {
          optionA: "Pečené kuracie stehno s brambory",
          optionB: "Hovädzí biftek s hubami a zemiakmi",
          optionC: "Špajdle z kuracieho mäsa s paradajkami",
        },
      },
      {
        meals: {
          desiata: "Mrkvový salát s jablkom",
          polievka: "Cesnaková polievka s krutónmi",
          olovrant: "Tvarožný kváskový koláč",
          vecera: "Kuracie prsná s karí omáčkou a ryžou",
        },
        ranajkyOptions: {
          optionA: "Chlieb s maslom a sekanou",
          optionB: "Ovsená kaša s banánom a medom",
        },
        obedOptions: {
          optionA: "Kuracie prsná v karí omáčke s ryžou",
          optionB: "Kurací paprikáš s domácimi rezancami",
          optionC: "Morská ryba na masle s brambory",
        },
      },
      {
        meals: {
          desiata: "Pudding s čokoládou",
          polievka: "Kapustnica s paprikou",
          olovrant: "Jablčný kváskový koláč",
          vecera: "Zeleninové rezance s pesto omáčkou",
        },
        ranajkyOptions: {
          optionA: "Chlieb s bryndzou",
          optionB: "Sladka kaša s ovocím",
        },
        obedOptions: {
          optionA: "Kapustnica s paprikou",
          optionB: "Rezance s hubami a bylinkami",
          optionC: "Kurací šalát s listami a dresingom",
        },
      },
      {
        meals: {
          desiata: "Chlieb s medom a orieškami",
          polievka: "Rajčinová polievka s bazilkou",
          olovrant: "Proteinová tyčinka",
          vecera: "Pečená ryba s listovým špenátom",
        },
        ranajkyOptions: {
          optionA: "Praženica s klobásou",
          optionB: "Chlieb s maslom a džemom",
        },
        obedOptions: {
          optionA: "Pečená ryba s špenátom a zemiakmi",
          optionB: "Grilované kuracie prsia s medovým dresingom",
          optionC: "Zeleninový kváskový koláč",
        },
      },
      {
        meals: {
          desiata: "Čerešne so smotanou",
          polievka: "Hovädzí bujón s rezancami",
          olovrant: "Ovocný nápoj s ľadom",
          vecera: "Cesnaková kura na grile",
        },
        ranajkyOptions: {
          optionA: "Ovsená kaša s jahodami",
          optionB: "Chlieb s tunou a majonézou",
        },
        obedOptions: {
          optionA: "Cesnaková kura na grile s ryžou",
          optionB: "Rezance s hovädzkým gulášom",
          optionC: "Zeleninový šalát s grešlou",
        },
      },
      {
        meals: {
          desiata: "Syrečky s medom",
          polievka: "Kapustnica s klobásou",
          olovrant: "Syrový kváskový koláč",
          vecera: "Hovädzí biftek s paradajkami",
        },
        ranajkyOptions: {
          optionA: "Chlieb s maslom a slaninkou",
          optionB: "Palačinky s džemom",
        },
        obedOptions: {
          optionA: "Hovädzí biftek s paradajkami a cesnakom",
          optionB: "Kuracie rezance s mrkvou a celeru",
          optionC: "Zeleninové polévka s krutónmi",
        },
      },
      {
        meals: {
          desiata: "Jablkový kváskový koláč",
          polievka: "Zeleninová polievka s bylinkami",
          olovrant: "Čokoládová tyčinka",
          vecera: "Kuracie špajdle s dusením",
        },
        ranajkyOptions: {
          optionA: "Chlieb s medom a orieškami",
          optionB: "Griechny jogurt s granolou",
        },
        obedOptions: {
          optionA: "Kuracie špajdle s dusením",
          optionB: "Hovädzí paprikáš s zemiakmi",
          optionC: "Rezance s hubami a pórkom",
        },
      },
      {
        meals: {
          desiata: "Chlieb s olejom a solou",
          polievka: "Syrová polievka s cesnakom",
          olovrant: "Pudding s obuolom",
          vecera: "Grilované lososové filé s bylinkami",
        },
        ranajkyOptions: {
          optionA: "Ovsená kaša s medom a orieškami",
          optionB: "Chlieb s maslom a paradajkami",
        },
        obedOptions: {
          optionA: "Grilované lososové filé s ryžou",
          optionB: "Kuracie prsná s paprikáš omáčkou",
          optionC: "Zeleninový gratin s mozzarelou",
        },
      },
      {
        meals: {
          desiata: "Tvaroh s medom a orechy",
          polievka: "Kroupová polievka s mrkvou",
          olovrant: "Čerešňa so smotanou",
          vecera: "Pečené kuracie stehno s bylinkami",
        },
        ranajkyOptions: {
          optionA: "Praženica s chlebom a syrom",
          optionB: "Chlieb so zvlášť maslom a medzi",
        },
        obedOptions: {
          optionA: "Pečené kuracie stehno s brambory",
          optionB: "Hovädzí guláš s rezancami",
          optionC: "Zeleninové rizoto s baselikou",
        },
      },
      {
        meals: {
          desiata: "Chlieb s syrom a paradajkami",
          polievka: "Čočová polievka so zeleninou",
          olovrant: "Ovocný smoothie",
          vecera: "Kuracie rezance s rozmarýnom",
        },
        ranajkyOptions: {
          optionA: "Chlieb s maslom a džemom",
          optionB: "Ovsená kaša s jablkami",
        },
        obedOptions: {
          optionA: "Kuracie rezance s rozmarýnom a zemiakmi",
          optionB: "Morská ryba s citrónom a masťou",
          optionC: "Zeleninový salát s jogurtovým dresingom",
        },
      },
      {
        meals: {
          desiata: "Mliečny puding s kakaom",
          polievka: "Krémová huľbová polievka",
          olovrant: "Proteinová tyčinka s arašidmi",
          vecera: "Hovädzí steak s dipom",
        },
        ranajkyOptions: {
          optionA: "Chlieb s maslom a slaninkou",
          optionB: "Palačinky s obuolami a cimou",
        },
        obedOptions: {
          optionA: "Hovädzí steak s paradajkami",
          optionB: "Kuracie prsná s muštardovým dresingom",
          optionC: "Špajdle z hovädza s testeninami",
        },
      },
      {
        meals: {
          desiata: "Griechny jogurt s granolou a medzi",
          polievka: "Sytá hovädzá polievka s cuketou",
          olovrant: "Čokoládové syrečky",
          vecera: "Pečená kura s cesnakom a rozmarýnom",
        },
        ranajkyOptions: {
          optionA: "Chlieb s maslom a medom",
          optionB: "Ovsená kaša s banánom a orechy",
        },
        obedOptions: {
          optionA: "Pečená kura s cesnakom a zemiakmi",
          optionB: "Rezance s hovädzím mäsom a paradajkami",
          optionC: "Zeleninový salát so slnečnicou",
        },
      },
    ];

    // Calculate dates starting from tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const { firestore } = getFirebaseAdmin();
    const batch = firestore.batch();
    const now = new Date();
    const results = [];

    // Create 14 days of meal data
    for (let i = 0; i < 14; i++) {
      const currentDate = new Date(tomorrow);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = formatDateStr(currentDate);

      // Select meal data (rotate through available meals)
      const mealIndex = i % seedMeals.length;
      const mealData = seedMeals[mealIndex];

      const dailyMealData: DailyMeal = {
        date: dateStr,
        meals: mealData.meals,
        ranajkyOptions: mealData.ranajkyOptions,
        obedOptions: mealData.obedOptions,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      };

      const mealsRef = firestore.collection("dailyMeals").doc(dateStr);
      batch.set(mealsRef, dailyMealData, { merge: true });

      results.push({
        date: dateStr,
        status: "scheduled",
      });
    }

    // Execute batch write
    await batch.commit();

    return {
      success: true,
      message: `Úspešne bolo seeded ${14} dní testovacích jedál`,
      daysSeeded: results,
      totalDays: 14,
    };
  } catch (error) {
    return handleApiError(error, "Nepodarilo sa seedovať dáta");
  }
});

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
