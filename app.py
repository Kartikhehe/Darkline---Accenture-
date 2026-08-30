import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from sklearn.metrics import average_precision_score, precision_recall_curve

st.set_page_config(page_title="Darkline — Live Assembly Line Digital Twin", layout="wide", initial_sidebar_state="collapsed")

# ---------------------------------------------------------
# Custom styling — dark industrial theme
# ---------------------------------------------------------
st.markdown("""
<style>
    .stApp { background-color: #0a0a12; }
    div[data-testid="stMetricValue"] { font-size: 2rem; color: #ffffff; }
    div[data-testid="stMetricLabel"] { color: #a78bfa; }
    .station-box {
        display: inline-block; width: 60px; height: 60px;
        border: 2px solid #7C3AED; border-radius: 8px;
        text-align: center; line-height: 60px; margin: 4px;
        font-weight: bold; color: white; font-size: 12px;
    }
    .alert-banner {
        background: linear-gradient(90deg, #7C3AED, #a855f7);
        padding: 16px; border-radius: 10px; color: white;
        font-size: 16px; margin: 10px 0;
    }
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------
# Data loading
# ---------------------------------------------------------
@st.cache_data
def load_data():
    df = pd.read_csv("dashboard_data.csv")
    df = df.sort_values("total_cycle_time").reset_index(drop=True)
    return df

df = load_data()
pr_auc = average_precision_score(df['Response'], df['risk_score'])
precisions, recalls, pr_thresholds = precision_recall_curve(df['Response'], df['risk_score'])

# ---------------------------------------------------------
# Header
# ---------------------------------------------------------
st.title("🏭 Darkline — Assembly Line Digital Twin")
st.caption("Team Cortex · Accenture Innovation Challenge 2026 · Simulated live replay of historical Bosch production data")

col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Parts Tracked", f"{len(df):,}")
col2.metric("High-Risk Alerts Raised", f"{int(df['alert'].sum()):,}")
col3.metric("Actual Failures in Data", f"{int(df['Response'].sum()):,}")

n_alerts = df['alert'].sum()
precision_at_threshold = (df[df['alert'] == True]['Response'].sum() / n_alerts * 100) if n_alerts > 0 else 0
col4.metric("Alert Precision", f"{precision_at_threshold:.1f}%",
            help="Of parts flagged high-risk, this % actually failed")

st.divider()

tab1, tab2, tab3, tab4 = st.tabs(["🔴 Live Simulation", "📊 Bottleneck Analysis", "🚨 High-Risk Parts", "📈 Model Performance"])

# ---------------------------------------------------------
# TAB 1: Live simulation with factory schematic + gauge
# ---------------------------------------------------------
with tab1:
    st.subheader("Live Line Replay")

    window = 3000
    step_size = st.slider("Parts per step", 100, 2000, 500)

    if "sim_pos" not in st.session_state:
        st.session_state.sim_pos = window

    c1, c2, c3 = st.columns([1, 1, 3])
    if c1.button("▶ Advance"):
        st.session_state.sim_pos = min(st.session_state.sim_pos + step_size, len(df))
    if c2.button("⏮ Reset"):
        st.session_state.sim_pos = window

    pos = st.session_state.sim_pos
    chunk = df.iloc[max(0, pos - window):pos]
    latest = df.iloc[max(0, pos - step_size):pos]

    # --- Factory line schematic ---
    st.markdown("#### Line Status")
    stations = ["Weld", "Paint", "S24", "S25", "S26", "Door", "Final"]
    bottleneck_idx = 4  # S26
    high_risk_now = latest[latest['alert'] == True].sort_values('risk_score', ascending=False)
    is_alerting = len(high_risk_now) > 0

    schematic = go.Figure()
    colors = ["#10B981"] * len(stations)
    if is_alerting:
        colors[bottleneck_idx] = "#EF4444"
    else:
        colors[bottleneck_idx] = "#F59E0B"

    for i, (name, color) in enumerate(zip(stations, colors)):
        schematic.add_shape(type="rect", x0=i*1.2, x1=i*1.2+1, y0=0, y1=1,
                             line=dict(color=color, width=3), fillcolor=color, opacity=0.25)
        schematic.add_annotation(x=i*1.2+0.5, y=0.5, text=f"<b>{name}</b>", showarrow=False,
                                  font=dict(color="white", size=13))
        if i < len(stations)-1:
            schematic.add_annotation(x=i*1.2+1.1, y=0.5, text="→", showarrow=False,
                                      font=dict(color="gray", size=18))

    schematic.update_layout(
        height=140, showlegend=False, plot_bgcolor="#0a0a12", paper_bgcolor="#0a0a12",
        xaxis=dict(visible=False, range=[-0.3, len(stations)*1.2]),
        yaxis=dict(visible=False, range=[-0.2, 1.2]),
        margin=dict(l=10, r=10, t=10, b=10)
    )
    st.plotly_chart(schematic, use_container_width=True)

    col_chart, col_gauge = st.columns([2, 1])

    with col_chart:
        fig = go.Figure()
        fig.add_trace(go.Scatter(y=chunk['total_cycle_time'].values, mode='lines',
                                  name='Cycle Time', line=dict(color='#7C3AED', width=2),
                                  fill='tozeroy', fillcolor='rgba(124,58,237,0.1)'))
        fig.update_layout(title="Rolling Cycle Time (Buffer Signal)", height=320,
                           margin=dict(t=40, b=20), plot_bgcolor="#111118", paper_bgcolor="#111118",
                           font=dict(color="white"))
        st.plotly_chart(fig, use_container_width=True)

    with col_gauge:
        current_risk = high_risk_now.iloc[0]['risk_score'] if is_alerting else latest['risk_score'].mean()
        gauge = go.Figure(go.Indicator(
            mode="gauge+number",
            value=current_risk * 100,
            title={'text': "Current Risk Level", 'font': {'color': 'white'}},
            number={'suffix': "%", 'font': {'color': 'white'}},
            gauge={
                'axis': {'range': [0, 100], 'tickcolor': "white"},
                'bar': {'color': "#EF4444" if is_alerting else "#10B981"},
                'steps': [
                    {'range': [0, 40], 'color': "#1f2937"},
                    {'range': [40, 70], 'color': "#3f2f47"},
                    {'range': [70, 100], 'color': "#4a1f2f"},
                ],
            }
        ))
        gauge.update_layout(height=320, paper_bgcolor="#111118", font=dict(color="white"),
                             margin=dict(t=40, b=10))
        st.plotly_chart(gauge, use_container_width=True)

    if is_alerting:
        top = high_risk_now.iloc[0]
        signal = top['top_signal'] if pd.notna(top['top_signal']) else "multiple factors"
        st.markdown(f"""
        <div class="alert-banner">
        🚨 <b>Vehicle {int(top['Id'])} — High defect risk</b> ({top['risk_score']*100:.1f}% confidence)<br>
        Top signal: <code>{signal}</code> · Inspect before final assembly.
        </div>
        """, unsafe_allow_html=True)
    else:
        st.success("✅ No high-risk parts in this window.")

    st.caption(f"Showing parts {max(0, pos - window)} to {pos} of {len(df)} (sorted by simulated process time)")

# ---------------------------------------------------------
# TAB 2: Bottleneck analysis
# ---------------------------------------------------------
with tab2:
    st.subheader("Station 24 → 26 Gap: Passed vs Failed")

    if df['gap_S24_S26'].notna().sum() > 0:
        gap_summary = df.groupby('Response')['gap_S24_S26'].mean().reset_index()
        gap_summary['Response'] = gap_summary['Response'].map({0: 'Passed', 1: 'Failed'})
        fig2 = px.bar(gap_summary, x='Response', y='gap_S24_S26', color='Response',
                      color_discrete_map={'Passed': '#10B981', 'Failed': '#EF4444'},
                      title="Avg Gap Between Station 24 and Station 26")
        fig2.update_layout(paper_bgcolor="#111118", plot_bgcolor="#111118", font=dict(color="white"))
        st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("No non-null gap_S24_S26 values in this dataset slice.")

    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown("#### Cycle Time Distribution")
        fig3 = px.histogram(df, x='total_cycle_time',
                             color=df['Response'].map({0: 'Passed', 1: 'Failed'}),
                             barmode='overlay', nbins=60, opacity=0.6,
                             color_discrete_map={'Passed': '#10B981', 'Failed': '#EF4444'})
        fig3.update_layout(paper_bgcolor="#111118", plot_bgcolor="#111118", font=dict(color="white"))
        st.plotly_chart(fig3, use_container_width=True)

    with col_b:
        st.markdown("#### Stations Visited Distribution")
        fig3b = px.histogram(df, x='n_stations_visited',
                              color=df['Response'].map({0: 'Passed', 1: 'Failed'}),
                              barmode='overlay', nbins=30, opacity=0.6,
                              color_discrete_map={'Passed': '#10B981', 'Failed': '#EF4444'})
        fig3b.update_layout(paper_bgcolor="#111118", plot_bgcolor="#111118", font=dict(color="white"))
        st.plotly_chart(fig3b, use_container_width=True)

    st.info(
        "**Finding:** Failed parts show longer, more variable dwell time at the Station 24→26 "
        "transition — independently confirmed by both process-timing analysis and the model's "
        "top sensor features, all located at Station 26."
    )

# ---------------------------------------------------------
# TAB 3: High-risk parts
# ---------------------------------------------------------
with tab3:
    st.subheader("Flagged High-Risk Parts")

    signal_options = ["All"] + sorted(df['top_signal'].dropna().unique().tolist())
    filt = st.selectbox("Filter by top signal", signal_options)

    view = df[df['alert'] == True].sort_values('risk_score', ascending=False)
    if filt != "All":
        view = view[view['top_signal'] == filt]

    col_table, col_pie = st.columns([2, 1])
    with col_table:
        st.dataframe(
            view[['Id', 'risk_score', 'top_signal', 'total_cycle_time', 'Response']].head(200)
                .style.background_gradient(subset=['risk_score'], cmap='Reds'),
            use_container_width=True, height=450
        )

    with col_pie:
        st.markdown("#### What's driving alerts?")
        signal_counts = df[df['alert'] == True]['top_signal'].dropna().value_counts().reset_index()
        signal_counts.columns = ['signal', 'count']
        if len(signal_counts) > 0:
            fig4 = px.pie(signal_counts, names='signal', values='count', hole=0.5)
            fig4.update_layout(paper_bgcolor="#111118", font=dict(color="white"), showlegend=True)
            st.plotly_chart(fig4, use_container_width=True)
        else:
            st.info("No top_signal data available.")

    # Explore a specific part
    st.markdown("#### Inspect a specific part")
    part_id = st.selectbox("Select Vehicle ID", view['Id'].head(50).tolist() if len(view) > 0 else [])
    if part_id:
        part = df[df['Id'] == part_id].iloc[0]
        pc1, pc2, pc3, pc4 = st.columns(4)
        pc1.metric("Risk Score", f"{part['risk_score']*100:.1f}%")
        pc2.metric("Cycle Time", f"{part['total_cycle_time']:.2f}")
        pc3.metric("Stations Visited", f"{int(part['n_stations_visited'])}")
        pc4.metric("Actual Outcome", "❌ Failed" if part['Response'] == 1 else "✅ Passed")

# ---------------------------------------------------------
# TAB 4: Model performance (all live-computed)
# ---------------------------------------------------------
with tab4:
    st.subheader("Model Performance")
    baseline_rate = df['Response'].mean()

    m1, m2, m3 = st.columns(3)
    m1.metric("PR-AUC", f"{pr_auc:.3f}", help=f"vs random baseline of {baseline_rate:.4f}")
    m2.metric("Lift over random", f"{pr_auc/baseline_rate:.1f}x")
    m3.metric("Alert Precision", f"{precision_at_threshold:.1f}%")

    total_failures = int(df['Response'].sum())
    caught = int(df[(df['alert'] == True) & (df['Response'] == 1)].shape[0])
    catch_rate = (caught / total_failures * 100) if total_failures > 0 else 0
    st.metric("Failures Caught Early", f"{caught} / {total_failures} ({catch_rate:.1f}%)")

    st.markdown("#### Precision–Recall Trade-off")
    pr_fig = go.Figure()
    pr_fig.add_trace(go.Scatter(x=recalls, y=precisions, mode='lines', line=dict(color='#7C3AED', width=3)))
    pr_fig.add_trace(go.Scatter(
        x=[caught/total_failures], y=[precision_at_threshold/100],
        mode='markers', marker=dict(size=14, color='#EF4444'), name='Current operating point'
    ))
    pr_fig.update_layout(
        title="Precision vs Recall — chosen operating point highlighted",
        xaxis_title="Recall", yaxis_title="Precision",
        paper_bgcolor="#111118", plot_bgcolor="#111118", font=dict(color="white"), height=400
    )
    st.plotly_chart(pr_fig, use_container_width=True)

    st.caption(
        "This curve shows the full trade-off space: a plant can choose a different point "
        "depending on inspection capacity vs. desired catch rate."
    )