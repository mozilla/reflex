import {main} from "reflex";
import * as Counter from "./counter";

main(document.body, Counter.Model({value: 0}), Counter.update, Counter.view);
