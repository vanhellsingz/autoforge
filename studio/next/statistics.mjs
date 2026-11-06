// Statistical compatibility checks supplement studio/equivalence.mjs; they do not certify parity.
function wilson(k,n,z=1.9599639845){
  const p=k/n,den=1+z*z/n;
  const center=(p+z*z/(2*n))/den;
  const half=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
  return [Math.max(0,center-half),Math.min(1,center+half)];
}
function counts(value){
  return value && Number.isSafeInteger(value.n)&&Number.isSafeInteger(value.successes)&&value.n>0&&
    value.successes>=0&&value.successes<=value.n;
}
export function compareRates(reference,candidate,{minN=200}={}){
  if(!Number.isSafeInteger(minN)||minN<30)throw Error('minN must be at least 30');
  const report={schemaVersion:'autoforge.statistics.v3',status:'UNVERIFIED',proof:'RECORDED_COUNTS_ONLY',
    independentExecutionProven:false,reference:null,candidate:null};
  if(!counts(reference)||!counts(candidate)||reference.n<minN||candidate.n<minN){
    report.reason='Missing/insufficient samples; require recorded independent trials';
    return report;
  }
  const a=wilson(reference.successes,reference.n),b=wilson(candidate.successes,candidate.n);
  report.reference={n:reference.n,successes:reference.successes,rate:reference.successes/reference.n,ci95:a};
  report.candidate={n:candidate.n,successes:candidate.successes,rate:candidate.successes/candidate.n,ci95:b};
  report.status=(a[1]<b[0]||b[1]<a[0])?'DIVERGENT_RECORDED':'COMPATIBLE_INTERVALS_RECORDED';
  report.reason=report.status==='DIVERGENT_RECORDED'?'Disjoint 95% intervals suggest distribution difference':
    'Overlapping confidence intervals do NOT prove statistical equivalence';
  return report;
}
