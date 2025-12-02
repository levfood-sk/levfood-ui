<script setup lang="ts">
import logoLongIcon from '~/assets/icons/logo-long-orange.svg'
</script>

<template>
  <div class="min-h-screen bg-[var(--color-beige)]">
    <!-- Navigation -->
    <nav class="bg-[var(--color-beige)]">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-center h-16 pb-6">
          <NuxtLink to="/" class="flex items-center mt-16">
            <img 
              :src="logoLongIcon" 
              alt="LevFood logo" 
              class="w-[240px] h-auto"
            />
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Content -->
    <div class="container mx-auto px-4 py-12 lg:py-20">
      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 lg:col-span-8 lg:col-start-3">
          <!-- Title -->
          <h1 class="md:text-[72px] sm:text-[72px] text-[48px] leading-[100%] font-condensed font-extrabold text-[var(--color-dark-green)] tracking-tight mb-12 text-center">
            Zásady ochrany osobných údajov a<br/>podmienky používania – LevFood
          </h1>

          <!-- Content Sections -->
          <div class="space-y-8 text-[var(--color-dark-green)]">
            <!-- Section 1 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">1. Úvod</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Tieto zásady upravujú spôsob, akým spoločnosť Krabičkovo s.r.o., so sídlom Ul. M. Monaca 5, 934 01 Levice a prevádzkou Kalvínske námestie 126/2, 934 01 Levice IČO: 57 238 707, zapísaná v Obchodnom registri SR, spracúva osobné údaje a používa webovú stránku www.levfood.sk (ďalej len „web").               </p>
              <p class="text-lg md:text-xl leading-[150%]">
                Používaním tohto webu vyjadrujete súhlas s nižšie uvedenými podmienkami. 
              </p>
            </section>

            <!-- Section 2 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">2. Prevádzkovateľ</h2>
              <div class="space-y-2 text-lg md:text-xl leading-[150%]">
                <p><strong>Krabičkovo s.r.o.</strong></p>
                <p>IČO: 57 238 707</p>
                <p>Sídlo: Ul. M. Monaca 5, 934 01 Levice</p>
                <p>Prevádzka: Kalvínske námestie 126/2, 934 01 Levice</p>
                <p>E-mail: <a href="mailto:info@levfood.sk" class="underline hover:text-[var(--color-orange)] transition-colors">info@levfood.sk</a></p>
                <p>Telefón: <a href="tel:+421911395933" class="underline hover:text-[var(--color-orange)] transition-colors">+421 911 395 933</a></p>
              </div>
              <p class="text-lg md:text-xl leading-[150%] mt-4">
                Prevádzkovateľ zodpovedá za ochranu a spracúvanie osobných údajov v súlade s platnou legislatívou.
              </p>
            </section>

            <!-- Section 3 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">3. Aké osobné údaje spracúvame</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Spracúvame len tie údaje, ktoré sú nevyhnutné na účely poskytovania našich služieb, najmä:
              </p>
              <ul class="list-disc list-inside space-y-2 text-lg md:text-xl leading-[150%] ml-4">
                <li>meno a priezvisko,</li>
                <li>e-mailová adresa,</li>
                <li>telefónne číslo,</li>
                <li>adresa doručenia,</li>
                <li>fakturačné údaje,</li>
                <li>informácie o preferenciách stravy (dobrovoľné údaje).</li>
              </ul>
            </section>

            <!-- Section 4 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">4. Účel spracovania údajov</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Vaše osobné údaje spracúvame na tieto účely:
              </p>
              <ul class="list-disc list-inside space-y-2 text-lg md:text-xl leading-[150%] ml-4">
                <li>spracovanie objednávky a doručenie jedla,</li>
                <li>vystavenie faktúry,</li>
                <li>komunikácia so zákazníkom,</li>
                <li>marketingová komunikácia (len so súhlasom),</li>
                <li>zlepšovanie kvality našich služieb a webu.</li>
              </ul>
            </section>

            <!-- Section 5 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">5. Právny základ spracovania</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Osobné údaje spracúvame na základe:
              </p>
              <ul class="list-disc list-inside space-y-2 text-lg md:text-xl leading-[150%] ml-4">
                <li>zmluvného vzťahu – spracovanie objednávky,</li>
                <li>plnenia zákonných povinností – vedenie účtovníctva,</li>
                <li>súhlasu dotknutej osoby – pri marketingovej komunikácii,</li>
                <li>oprávneného záujmu – ochrana práv a majetku prevádzkovateľa.</li>
              </ul>
            </section>

            <!-- Section 6 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">6. Uchovávanie osobných údajov</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Údaje uchovávame len po dobu nevyhnutnú na splnenie účelu, pre ktorý boli získané:
              </p>
              <ul class="list-disc list-inside space-y-2 text-lg md:text-xl leading-[150%] ml-4">
                <li>údaje z objednávok – 5 rokov (zákonná lehota),</li>
                <li>marketingové údaje – do odvolania súhlasu,</li>
                <li>údaje z cookies – podľa nastavení používateľa (viď nižšie).</li>
              </ul>
            </section>

            <!-- Section 7 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">7. Cookies</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Na našom webe používame cookies na:
              </p>
              <ul class="list-disc list-inside space-y-2 text-lg md:text-xl leading-[150%] ml-4 mb-4">
                <li>zabezpečenie správneho fungovania webu,</li>
                <li>analýzu návštevnosti (Google Analytics),</li>
                <li>prispôsobenie obsahu a reklamy.</li>
              </ul>
              <p class="text-lg md:text-xl leading-[150%]">
                Pri prvej návšteve webu sa zobrazí lišta, kde môžete udeliť alebo odmietnuť súhlas s jednotlivými typmi cookies. Nastavenia môžete kedykoľvek zmeniť v sekcii „Nastavenia cookies".
              </p>
            </section>

            <!-- Section 8 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">8. Zdieľanie údajov s tretími stranami</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Vaše údaje môžeme sprístupniť len:
              </p>
              <ul class="list-disc list-inside space-y-2 text-lg md:text-xl leading-[150%] ml-4 mb-4">
                <li>účtovným a IT partnerom (na základe zmluvy o spracovaní údajov),</li>
                <li>orgánom verejnej správy – len ak to vyžaduje zákon.</li>
              </ul>
              <p class="text-lg md:text-xl leading-[150%]">
                Nikdy nepredávame ani neprenajímame vaše údaje tretím stranám.
              </p>
            </section>

            <!-- Section 9 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">9. Práva dotknutých osôb</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                V súlade s GDPR máte právo:
              </p>
              <ul class="list-disc list-inside space-y-2 text-lg md:text-xl leading-[150%] ml-4 mb-4">
                <li>na prístup k svojim údajom,</li>
                <li>na opravu alebo vymazanie,</li>
                <li>na obmedzenie spracovania,</li>
                <li>na prenos údajov,</li>
                <li>na odvolanie súhlasu,</li>
                <li>na podanie sťažnosti dozornému orgánu (Úrad na ochranu osobných údajov SR).</li>
              </ul>
              <p class="text-lg md:text-xl leading-[150%]">
                Žiadosť môžete poslať e-mailom na: <a href="mailto:info@levfood.sk" class="underline hover:text-[var(--color-orange)] transition-colors">info@levfood.sk</a>.
              </p>
            </section>

            <!-- Section 10 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">10. Bezpečnosť údajov</h2>
              <p class="text-lg md:text-xl leading-[150%]">
                Vaše údaje chránime modernými technickými a organizačnými opatreniami, ktoré zabraňujú neoprávnenému prístupu, strate či zneužitiu údajov. Všetky prenosy údajov sú šifrované.
              </p>
            </section>

            <!-- Section 11 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">11. Podmienky používania webu</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Používaním tohto webu sa zaväzujete:
              </p>
              <ul class="list-disc list-inside space-y-2 text-lg md:text-xl leading-[150%] ml-4 mb-4">
                <li>používať ho len v súlade so zákonmi SR,</li>
                <li>nezneužívať obsah webu ani značku LevFood,</li>
                <li>nezasahovať do jeho bezpečnosti alebo fungovania.</li>
              </ul>
              <p class="text-lg md:text-xl leading-[150%]">
                Prevádzkovateľ nezodpovedá za dočasnú nedostupnosť webu alebo chyby spôsobené technickými faktormi mimo jeho kontroly.
              </p>
            </section>

            <!-- Section 12 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">12. Zmeny podmienok</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Tieto zásady môžu byť aktualizované. Aktuálna verzia bude vždy zverejnená na stránke www.levfood.sk/zasady s uvedením dátumu účinnosti.
              </p>
              <p class="text-lg md:text-xl leading-[150%]">
                <strong>Dátum účinnosti: 15. november 2025</strong>
              </p>
            </section>

            <!-- Section 13 -->
            <section>
              <h2 class="text-2xl md:text-3xl font-condensed font-bold mb-4">13. Kontakt</h2>
              <p class="text-lg md:text-xl leading-[150%] mb-4">
                Ak máte otázky ohľadom ochrany osobných údajov, kontaktujte nás:
              </p>
              <div class="space-y-2 text-lg md:text-xl leading-[150%]">
                <p>
                  <a href="mailto:info@levfood.sk" class="underline hover:text-[var(--color-orange)] transition-colors">info@levfood.sk</a>
                </p>
                <p>
                  <a href="tel:+421911395933" class="underline hover:text-[var(--color-orange)] transition-colors">+421 911 395 933</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <Footer />
  </div>
</template>

