# Tutoriel — Surr IOR Viewer

Ce tutoriel pas‑à‑pas explique comment utiliser l'outil **et** comment réinjecter la recette JSON dans Three.js, Blender ou Unity.

---

## Sommaire

1. [Premiers pas dans l'interface](#1-premiers-pas-dans-linterface)
2. [Comprendre les paramètres PBR](#2-comprendre-les-paramètres-pbr)
3. [Créer un matériau personnalisé](#3-créer-un-matériau-personnalisé)
4. [Exporter et réutiliser un matériau](#4-exporter-et-réutiliser-un-matériau)
5. [Personnaliser l'outil](#5-personnaliser-loutil)
6. [Questions fréquentes](#6-questions-fréquentes)

---

## 1. Premiers pas dans l'interface

À l'ouverture, tu vois trois zones :

- **À gauche (ou en bas sur mobile)** : les tableaux IOR. Le premier est une sélection « cliquable » de référence, les autres listent ~300 matériaux par lettre.
- **À droite (ou en haut sur mobile)** : la vue 3D temps réel avec une théière, le bandeau du matériau actif, trois stats live (IOR, métal, transmission) et quatre sliders.
- **En bas** : le bouton de téléchargement de la recette JSON.

### Interactions de base

| Action                              | Effet                                                                  |
|-------------------------------------|------------------------------------------------------------------------|
| Clic sur une ligne de tableau       | Charge ce matériau sur la théière                                      |
| Clic glissé sur la théière          | Tourne la caméra autour de l'objet                                     |
| Molette de souris                   | Zoom avant / arrière                                                   |
| Pincement (mobile)                  | Zoom (à venir, scroll au doigt pour l'instant)                         |
| Sliders                             | Affinent les paramètres du matériau actif                              |
| Bouton **Télécharger la recette**   | Exporte un fichier `.json` réutilisable                                |

---

## 2. Comprendre les paramètres PBR

### IOR — Indice de Réfraction

L'IOR mesure de combien la lumière est ralentie / déviée en traversant un milieu. C'est le paramètre clé d'un matériau **transparent** :

- **1.000** = vide / air (aucune réfraction)
- **1.309** = glace
- **1.333** = eau
- **1.500** = verre commun
- **1.760 – 1.779** = saphir / rubis
- **2.418** = diamant (très réfractif, étincelles)

> ℹ️ Sur les métaux on parle parfois d'IOR aussi (or = 0.47) mais l'effet visuel est gouverné par la **réflectance**, pas la réfraction. C'est pourquoi le slider IOR se cache automatiquement quand `metalness ≥ 0.5`.

### Metalness — Métallicité

Curseur binaire en pratique : soit **0** (diélectrique : verre, plastique, peinture…), soit **1** (métal pur : or, cuivre, acier…). Les valeurs intermédiaires servent à simuler de la rouille, des oxydes, des peintures métallisées.

- **Diélectrique** → la couleur est diffuse, le reflet est neutre
- **Métal** → la couleur **est** le reflet ; pas de transmission possible

### Roughness — Rugosité

- **0** = poli miroir (verre net, métal chromé)
- **0.5** = aspect satiné
- **1** = mat (plastique cassé, verre dépoli)

### Transmission — Transparence physique

Spécifique au verre / cristal / liquides :

- **0** = opaque (le matériau bloque la lumière)
- **1** = totalement transparent

Combinée à l'IOR, elle produit l'effet de **réfraction** visible sur la théière (le fond se déforme à travers l'objet).

---

## 3. Créer un matériau personnalisé

**Exemple : un verre dépoli légèrement teinté**

1. Clique sur **Verre (Défaut)** dans le premier tableau pour partir d'une base saine.
2. Glisse le **Roughness** vers `0.35` — la théière devient floue, comme un verre sablé.
3. Garde **Métallicité** à 0 et **Transmission** à 1 (toujours visible).
4. Ajuste l'**IOR** à `1.42` pour adoucir la déformation.
5. La couleur peut être modifiée en éditant `data-color` dans `index.html` ou directement le swatch (V2).

**Exemple : un métal mat type aluminium brossé**

1. Clique sur **Aluminium**.
2. Pousse **Roughness** à `0.6`.
3. Les sliders IOR et Transmission disparaissent : c'est normal, ils n'ont pas de sens sur un métal.

---

## 4. Exporter et réutiliser un matériau

Clique sur **Télécharger la recette (.json)**. Tu obtiens un fichier comme :

```json
{
  "name": "Verre (Défaut)",
  "type": "Diélectrique",
  "ior": 1.5,
  "roughness": 0.0,
  "metalness": 0.0,
  "transmission": 1.0,
  "color": "#ffffff",
  "thickness": 0.9,
  "clearcoat": 0.6,
  "envMapIntensity": 1.2
}
```

### Réutilisation dans Three.js

```js
const recipe = await fetch('material.json').then(r => r.json());
const mat = new THREE.MeshPhysicalMaterial({
    color: recipe.color,
    ior: recipe.ior,
    roughness: recipe.roughness,
    metalness: recipe.metalness,
    transmission: recipe.transmission,
    thickness: recipe.thickness,
    clearcoat: recipe.clearcoat,
    envMapIntensity: recipe.envMapIntensity
});
```

### Réutilisation dans Blender (Principled BSDF)

| JSON               | Slot Blender (Principled BSDF) |
|--------------------|--------------------------------|
| `color`            | Base Color                     |
| `metalness`        | Metallic                       |
| `roughness`        | Roughness                      |
| `ior`              | IOR                            |
| `transmission`     | Transmission Weight            |
| `clearcoat`        | Coat Weight                    |

### Réutilisation dans Unity (URP / HDRP)

- Shader **Lit** (URP) ou **Lit** (HDRP).
- Workflow **Metallic** pour `metalness` + `roughness` (HDRP utilise `Smoothness = 1 - roughness`).
- HDRP supporte directement `Refraction Model: Thin/Sphere` avec un slot **Index of Refraction**.

---

## 5. Personnaliser l'outil

### Ajouter un preset cliquable au tableau du haut

Ouvre `index.html` et ajoute une ligne dans la `<tbody>` du premier tableau :

```html
<tr class="clickable-row"
    data-name="Saphir"
    data-type="dielectric"
    data-ior="1.77"
    data-color="#1e3a8a"
    data-roughness="0.0"
    data-metalness="0.0"
    data-transmission="1.0">
    <td><strong>Saphir</strong></td>
    <td class="ior-value">1.770</td>
</tr>
```

> Note : toutes les lignes des autres tableaux sont automatiquement rendues cliquables. Le script auto-détecte le type (métal vs diélectrique) à partir de la valeur d'IOR.

### Changer la palette

Tous les tokens de couleur sont dans `:root` au début de `css/style.css` :

```css
--pink: #ff2d91;   /* couleur principale */
--cyan: #5ef0ff;   /* accent secondaire (lumière 3D) */
--bg-0: #07070c;   /* fond global */
```

### Changer l'environnement HDR

Dans `js/app.js`, remplace l'URL passée à `hdrLoader.load(...)` par n'importe quel `.hdr` accessible en HTTPS (Poly Haven, threejs.org/examples/textures/…).

### Changer la géométrie

`TeapotGeometry` peut être remplacée par n'importe quelle géométrie Three.js :

```js
const geometry = new THREE.SphereGeometry(1.2, 64, 64);
// ou
const geometry = new THREE.TorusKnotGeometry(0.8, 0.28, 128, 16);
```

---

## 6. Questions fréquentes

**La théière est noire / sans reflet.**
Le HDR n'a pas pu se charger (offline / blocage CDN). Les lumières de secours rose et cyan prennent le relais, mais l'éclat sera moindre. Vérifie la console navigateur.

**Le slider IOR a disparu.**
Tu as un matériau métal actif (`metalness ≥ 0.5`). C'est volontaire : sur un métal, l'IOR n'a pas d'effet visible. Baisse la métallicité ou choisis un diélectrique.

**La couleur ne change pas quand je clique sur une ligne d'un tableau secondaire.**
Les tableaux secondaires sont génériques : le script utilise du blanc par défaut pour les diélectriques. Pour avoir une couleur précise, ajoute la ligne en preset (voir [Personnaliser l'outil](#5-personnaliser-loutil)).

**Comment publier mes changements sur GitHub ?**
Lance `publish.bat` (Windows) — il fait `git add . && git commit && git push` avec un message demandé interactivement.

---

Bon stuff ! Si tu construis quelque chose avec, tag **[@surrendrstudio](https://www.surrendr.studio)**.
