# Automatisation marketing n8n — MVP (phase 1) 🇨🇮

**Objectif :** tu envoies un produit (photo + nom + prix + argument) → le système
l'analyse, écrit le texte publicitaire, et **publie automatiquement le post sur ta
Page Facebook**.

```
[Produit] → Agent 1 Ingestion & analyse → Agent 2 Génération créative → Agent 4 Publication Facebook
                    (Claude vision)            (Claude copywriting)         (Meta Graph API)
```

Chaque étape enregistre son résultat dans Postgres (tables `produits` et
`publications`) : historique complet + reprise possible en cas d'erreur.

## 1. Prérequis

- **Docker Desktop** installé (https://www.docker.com/products/docker-desktop) —
  clique Suivant partout, puis redémarre l'ordinateur.
- Une clé API **Anthropic** (la même que pour CreatorX AI).
- Une **Page Facebook** + un compte **Meta Business** (voir section 4).

## 2. Lancement (5 minutes)

Ouvre un terminal (PowerShell sur Windows) dans ce dossier `n8n-automation/` :

```bash
# 1. Copier la configuration et la remplir (ANTHROPIC_API_KEY au minimum)
cp .env.example .env      # Windows : copy .env.example .env

# 2. Tout démarrer (n8n + Postgres, tables créées automatiquement)
docker compose up -d
```

Ouvre ensuite **http://localhost:5678** → crée ton compte administrateur n8n.

## 3. Importer les 3 workflows

1. Dans n8n : **Workflows → ⋯ → Import from File** → importe, un par un,
   les 3 fichiers du dossier `workflows/` (`1-ingestion.json`, `2-generation.json`,
   `3-publication.json`).
2. Crée l'identifiant Postgres : dans n8n, **Credentials → Add credential →
   Postgres** → nomme-le exactement `Postgres marketing` avec :
   - Host : `postgres` · Database : `marketing` · User : `creatorx`
   - Password : celui de ton `.env` · Port : `5432`
3. Ouvre chaque workflow, clique sur le nœud Postgres et vérifie que
   l'identifiant `Postgres marketing` est bien sélectionné.
4. **Active les 3 workflows** (interrupteur en haut à droite de chacun).

## 4. Configurer la Meta Graph API (publication Facebook)

1. Va sur **https://developers.facebook.com** → *My Apps* → *Create App* →
   type **Business**.
2. Ajoute le produit **Facebook Login for Business** puis ouvre
   l'outil **Graph API Explorer** (menu Tools).
3. Dans Graph API Explorer : sélectionne ton app → *Get Token* →
   **Get Page Access Token** → choisis ta Page → accorde les permissions
   `pages_manage_posts` et `pages_read_engagement`.
4. Récupère :
   - **FB_PAGE_ID** : sur ta Page Facebook → À propos → « ID de la Page »
     (ou via Graph Explorer : requête `me/accounts`).
   - **FB_PAGE_ACCESS_TOKEN** : le jeton généré à l'étape 3. Pour un jeton
     **longue durée**, échange-le via l'outil *Access Token Debugger* →
     « Extend Access Token ».
5. Mets ces 2 valeurs dans ton `.env`, puis relance : `docker compose up -d`.

> ⚠️ En mode développement, l'app Meta ne peut publier que sur les Pages dont tu
> es admin — parfait pour le MVP. La validation d'app (App Review) ne sera
> nécessaire que pour publier au nom d'autres utilisateurs (phase 2+).

## 5. Tester le pipeline complet

Envoie un produit au webhook d'ingestion (remplace l'URL de l'image par une
vraie image accessible en ligne — par exemple une photo hébergée sur ton
Supabase Storage CreatorX) :

```bash
curl -X POST http://localhost:5678/webhook/produit \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Robe wax élégante",
    "prix_fcfa": 15000,
    "argument": "Tissu wax premium, coupe moderne",
    "image_url": "https://exemple.com/photo-robe.jpg",
    "whatsapp": "+2250701020304",
    "langues": "français"
  }'
```

Réponse attendue (après ~10-20 secondes) :

```json
{ "succes": true, "message": "✅ Post publié sur la Page Facebook", "facebook_post_id": "..." }
```

Va voir ta Page Facebook : le post y est. 🎉

En cas d'erreur : dans n8n, menu **Executions** → clique sur l'exécution rouge →
tu vois exactement quel nœud a échoué et pourquoi.

## 6. Variables d'environnement

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | Clé Claude (analyse produit + copywriting) |
| `CLAUDE_MODEL` | Modèle utilisé (défaut : Haiku, économique) |
| `FB_PAGE_ID` | ID de ta Page Facebook |
| `FB_PAGE_ACCESS_TOKEN` | Jeton d'accès de la Page (longue durée) |
| `POSTGRES_*` | Accès base de données |
| `WEBHOOK_URL` | URL publique de n8n (localhost en local) |

## 7. Prochaines phases (déjà cadrées dans le cahier des charges)

- **Phase 2** : Instagram (même app Meta), TikTok Content Posting API,
  YouTube Data API, génération vidéo courte (fal.ai comme dans CreatorX AI).
- **Phase 3** : Agent Ciblage (paramètres d'audience par réseau) + Agent
  Engagement (réponses aux commentaires avec validation humaine, stats).
- **Phase 4** : boost publicitaire automatique via Meta Marketing API /
  TikTok Ads + tableau de bord des performances.

> Règle d'or conservée partout : **uniquement les APIs officielles** des
> plateformes (jamais de bots qui simulent un utilisateur — risque de
> bannissement), et validation humaine possible avant publication.
