import { connpassAdapter } from "./connpass";
import { goTokyoAdapter } from "./go-tokyo";
import { ktoAdapter } from "./kto";
import { meetupPublicAdapter } from "./meetup-public";
import { nurioAdapter } from "./nurio";
import { seoulOpenDataAdapter } from "./seoul-open-data";

export const sourceAdapters = [meetupPublicAdapter, nurioAdapter, seoulOpenDataAdapter, goTokyoAdapter, ktoAdapter, connpassAdapter];
