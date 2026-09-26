export default function Methodology() {
  return <main className="shell"><section className="mast"><div><div className="eyebrow">Protocol v1</div>
    <h1>How scores are made.</h1></div><p className="lede">Every published result uses the same certified dataset revision, prompt adapters, deterministic graders, and immutable judge profile.</p></section>
    <section className="panel-grid"><article className="panel"><h2>Scoring</h2><p className="lede">Structured tasks use exact source-aware graders. Open-ended answers use a pinned judge rubric. Each track is averaged independently; the Najd score is the macro-average across all 21 tracks.</p></article>
      <aside className="panel"><div className="eyebrow">Publication rules</div><p>5,717/5,717 cases complete</p><p>Temperature 0</p><p>100% grading coverage</p><p>Najd review required</p></aside></section></main>;
}
