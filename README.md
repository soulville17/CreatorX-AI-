# CreatorX AI 🇨🇮

**Dépose ton produit. Nos agents IA font ta pub.**

Plateforme SaaS pour les PME et vendeuses en ligne de Côte d'Ivoire et d'Afrique de
l'Ouest francophone : vidéos publicitaires professionnelles, contenus réseaux sociaux,
campagnes Meta ciblées (Click-to-WhatsApp) — payables en **Wave / Orange Money / MTN /
Moov** via CinetPay, sans carte bancaire.

## L'équipe de 8 agents IA

| Agent | Rôle | Coût client |
|---|---|---|
| 🎯 Marketing | Analyse le produit (positionnement, arguments, prix du marché, acheteur type) | Gratuit |
| ✍️ Copywriter | Textes de vente (3 variantes) adaptés au marché ivoirien | 1 crédit |
| 🖼️ Visuel | Visuels publicitaires (FLUX via fal.ai) | 3 crédits |
| 🎬 Vidéo | Vidéos 15 s verticales 9:16 (Kling/Wan via fal.ai), file d'attente, 2 régénérations offertes | 20 crédits |
| 🎙️ Voix IA | Voix off françaises naturelles (ElevenLabs) | 2 crédits |
| 📱 Réseaux sociaux | Déclinaisons TikTok / Instagram / Facebook / Shorts / WhatsApp | 3 crédits |
| 📢 Publicité | Brief complet de campagne Meta + checklist de lancement | Inclus campagne |
| 📊 Analyse | Résumés quotidiens en langage simple + signaux d'alerte | Inclus campagne |
| 🔄 Optimisation | Recommandations concrètes d'ajustement | Inclus campagne |
| 🔍 Modération (invisible) | Vérifie chaque produit (contrefaçons, produits interdits par Meta…) | Automatique |

**Packs de crédits :** Découverte 2 000 FCFA / 15 crédits · Vendeuse 5 000 FCFA / 45 crédits · Pro PME 15 000 FCFA / 150 crédits.
**Campagnes :** budget client 10 000 / 25 000 / 50 000 FCFA (ou libre ≥ 10 000) ; 65 % du budget part réellement chez Meta, la marge couvre les frais CinetPay et le service.

## Stack

- **Frontend :** React 18 + TypeScript + Vite + Tailwind CSS v4 + Zustand + Framer Motion
- **Backend :** Supabase (Auth, PostgreSQL + RLS, Storage, Edge Functions Deno)
- **IA :** Anthropic Claude (textes/briefs/modération), fal.ai (FLUX images, Kling/Wan vidéos), ElevenLabs (voix)
- **Paiement :** CinetPay (sandbox par défaut)
- **Déploiement :** Vercel

## Installation locale

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env
# → remplis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 3. Lancement
npm run dev
```

## Configuration Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit).
2. Applique la migration : contenu de `supabase/migrations/0001_schema_initial.sql`
   dans l'éditeur SQL du dashboard, ou via CLI :
   ```bash
   npx supabase link --project-ref TON_PROJET
   npx supabase db push
   ```
3. Configure les secrets des Edge Functions :
   ```bash
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... \
     FAL_API_KEY=... ELEVENLABS_API_KEY=... \
     CINETPAY_API_KEY=... CINETPAY_SITE_ID=... CINETPAY_SECRET_KEY=... \
     SITE_URL=https://ton-site.vercel.app VIDEO_MODEL=kling
   ```
4. Déploie les fonctions :
   ```bash
   npx supabase functions deploy
   ```
   (`cinetpay-webhook` est configurée sans vérification JWT dans `supabase/config.toml` —
   elle est appelée par les serveurs CinetPay.)

### Devenir administrateur

Après ton inscription, dans l'éditeur SQL :

```sql
update profiles set is_admin = true where id = (
  select id from auth.users where email = 'ton@email.com'
);
```

## Configuration CinetPay

1. Crée un compte marchand sur [cinetpay.com](https://cinetpay.com) (documents
   d'identité / registre de commerce à prévoir pour la production).
2. Récupère `API_KEY`, `SITE_ID` et la clé secrète (mode **sandbox** d'abord).
3. Dans le back-office CinetPay, l'URL de notification est envoyée automatiquement
   par `create-payment` : `https://TON_PROJET.supabase.co/functions/v1/cinetpay-webhook`.
4. Frais réels : 1,5 % à 3,5 % par transaction — déjà couverts par la marge (35 %)
   sur les campagnes et le prix des packs.

## Déploiement Vercel

1. Importe le dépôt sur [vercel.com](https://vercel.com) (framework : Vite).
2. Ajoute les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Le fichier `vercel.json` gère déjà les routes SPA.
4. Mets à jour le secret `SITE_URL` des Edge Functions avec l'URL Vercel finale.

## Fonctionnement des campagnes (phase 1)

1. Le client choisit produit + budget + durée → l'**Agent Publicité** génère le brief
   (ciblage, textes, budget quotidien Meta = 65 % du budget client / durée, checklist).
2. Le client paie via CinetPay → le webhook passe la campagne en `payee`.
3. L'**admin** retrouve la campagne dans son espace, copie le brief et lance la pub
   manuellement dans **Meta Ads Manager** (compte du fondateur).
4. Chaque jour, l'admin saisit les stats → l'**Agent Analyse** rédige le résumé client,
   l'**Agent Optimisation** propose des ajustements.
5. Phase 2 : le module `supabase/functions/_shared/metaAdsService.ts` est prévu pour
   brancher la **Meta Marketing API** (passer `META_ADS_IMPLEMENTATION=api`).

## Contrôle des coûts

- Barème serveur : `supabase/functions/_shared/credits.ts` (débit **atomique** via la
  fonction SQL `debit_credits`, remboursement automatique en cas d'échec).
- Chaque génération logge son coût estimé (`generations.cout_api_estime_fcfa`) ;
  l'admin suit la rentabilité dans **Espace admin → Coûts API**.
- Vidéos : débit de 20 crédits **avant** lancement, file d'attente, maximum
  2 régénérations offertes.

## Structure du projet

```
src/
  components/     # UI partagée (boutons, cartes, layout)
  features/       # un dossier par fonctionnalité (landing, auth, studio, campagnes…)
  lib/            # client Supabase, barème des crédits
  stores/         # état global Zustand
supabase/
  migrations/     # schéma SQL + RLS + fonctions
  functions/      # Edge Functions (les 8 agents, modération, paiement)
```
