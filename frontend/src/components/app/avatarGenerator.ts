import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';

function getRandomHexColor() {
  return Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

export function getAvatarSvg(name: string, lastName: string) {
  const randomColor = getRandomHexColor();
  const seed = (name.charAt(0) + lastName.charAt(0)).toUpperCase();
  return createAvatar(initials, {
    seed: seed,
    backgroundColor: [randomColor],
    fontSize: 36,
    radius: 50,
    size: 64,
  }).toDataUri();
}

function getColorPerGender(n: string) {
  const s = n.toLowerCase();
  if (s === "f"){
    return "ffc2d9"
  }
  if (s === "m"){
    return "97cbfb"
  }
  else {
    return Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  }
}

export function getAvatarResidenteSvg(name: string, lastName: string, sexo: string) {
  const iconColor = getColorPerGender(sexo);
  const seed = (name.charAt(0) + lastName.charAt(0)).toUpperCase();
  return createAvatar(initials, {
    seed: seed,
    backgroundColor: [iconColor],
    fontSize: 36,
    radius: 50,
    size: 64,
  }).toDataUri();
}
