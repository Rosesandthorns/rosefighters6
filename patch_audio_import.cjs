const fs = require('fs');
let code = fs.readFileSync('src/GameCanvas.tsx', 'utf8');

if (!code.includes("import rivalThemeUrl")) {
  code = code.replace("import React, { useEffect, useRef, useState } from 'react';", "import React, { useEffect, useRef, useState } from 'react';\nimport rivalThemeUrl from './assets/rival_theme.mp3';");
}

code = code.replace("audio = new Audio('/rival_theme.mp3');", "audio = new Audio(rivalThemeUrl);");

fs.writeFileSync('src/GameCanvas.tsx', code);
