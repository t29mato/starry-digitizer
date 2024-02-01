import { defineComponent } from 'vue';
import SymbolExtractByArea from '@/application/strategies/extractStrategies/symbolExtractByArea';

export default defineComponent({
data() {
return {
symbolExtractByArea: SymbolExtractByArea.instance,
};
},
methods: {
inputMin(value: string) {
this.symbolExtractByArea.setMinDiameterPx(parseInt(value));
},
inputMax(value: string) {
this.symbolExtractByAreasetMaxDiameterPx(parseInt(value));
},
},
});
