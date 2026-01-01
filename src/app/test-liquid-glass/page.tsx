"use client";

import { ContactCard, LinksCard, ProfileCard } from "@/components/liquid-glass";

export default function LiquidGlassPage() {
    return (
        <main className="min-h-screen w-full relative overflow-hidden" style={{ background: '#020c1b', fontFamily: 'var(--font-mono)' }}>
            {/* Contact Card */}
            <ContactCard />

            {/* Other cards - Temporarily hidden to avoid overlap */}
            {/* <ProfileCard /> */}
            {/* <LinksCard /> */}

            {/* Background content */}
            <div style={{ padding: "100px 50px", maxWidth: 1000, margin: "0 auto", position: "relative" }}>
                <h1 style={{ fontSize: 60, color: "white", marginBottom: 50, textAlign: "center" }}>Liquid Glass Demo</h1>

                <div style={{ display: 'flex', gap: 50, marginBottom: 150, alignItems: 'center' }}>
                    <div style={{ width: 300, height: 300, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                        <img src="https://picsum.photos/id/10/800/800" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, color: 'white' }}>
                        <h2 style={{ fontSize: 40, marginBottom: 20 }}>Forest Views</h2>
                        <p style={{ fontSize: 18, lineHeight: 1.6, opacity: 0.9 }}>Scroll down! The glass card is fixed to the viewport.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 50, marginBottom: 150, alignItems: 'center', flexDirection: 'row-reverse' }}>
                    <div style={{ width: 300, height: 300, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                        <img src="https://picsum.photos/id/28/800/800" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, color: 'white', textAlign: 'right' }}>
                        <h2 style={{ fontSize: 40, marginBottom: 20 }}>Mountain Air</h2>
                        <p style={{ fontSize: 18, lineHeight: 1.6, opacity: 0.9 }}>The liquid glass effect creates a beautiful frosted glass appearance.</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 100 }}>
                    {[101, 102, 103, 104].map(id => (
                        <div key={id} style={{ height: 200, borderRadius: 10, overflow: 'hidden' }}>
                            <img src={`https://picsum.photos/id/${id}/600/400`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 50, marginBottom: 150, alignItems: 'center' }}>
                    <div style={{ width: 400, height: 250, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                        <img src="https://picsum.photos/id/15/800/500" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, color: 'white' }}>
                        <h2 style={{ fontSize: 40, marginBottom: 20 }}>Ocean Vibes</h2>
                        <p style={{ fontSize: 18, lineHeight: 1.6, opacity: 0.9 }}>Keep scrolling to see how the glass card dynamically refracts the background.</p>
                    </div>
                </div>

                <div style={{ marginBottom: 150 }}>
                    <div style={{ width: '100%', height: 400, borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
                        <img src="https://picsum.photos/id/29/1200/600" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 100 }}>
                    {[110, 111, 112, 113, 114, 115].map(id => (
                        <div key={id} style={{ height: 180, borderRadius: 12, overflow: 'hidden' }}>
                            <img src={`https://picsum.photos/id/${id}/400/300`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: "center", color: "white", paddingBottom: 150 }}>
                    <h2 style={{ fontSize: 48, marginBottom: 30 }}>End of Demo</h2>
                    <p style={{ fontSize: 18, opacity: 0.8 }}>Scroll back up to see the glass effect in action.</p>
                </div>
            </div>
        </main >
    );
}
