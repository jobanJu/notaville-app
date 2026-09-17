'use client'

import { useState } from 'react'
import ImageVille from './ImageVille'

export default function ClassementTabs({ residents, voyageurs }) {
  const [onglet, setOnglet] = useState('residents')
  const lignes = onglet === 'residents' ? residents : voyageurs

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => setOnglet('residents')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            onglet === 'residents' ? 'bg-gradient-to-r from-coral to-amber text-[#2A0F0F]' : 'border border-card-edge text-text-soft'
          }`}
        >
          Vécu au quotidien
        </button>
        <button
          onClick={() => setOnglet('voyageurs')}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            onglet === 'voyageurs' ? 'bg-gradient-to-r from-coral to-amber text-[#2A0F0F]' : 'border border-card-edge text-text-soft'
          }`}
        >
          Impression de passage
        </button>
      </div>

      <p className="mt-4 text-sm text-text-soft">
        {onglet === 'residents'
          ? 'Notes des habitants, sur leur quotidien : mobilité, propreté, vie de quartier.'
          : "Avis de voyageurs, sur leur séjour — logiquement plus indulgents qu'un vécu au quotidien."}
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-card-edge">
        {lignes.length === 0 && (
          <p className="p-6 text-center text-sm text-text-soft">
            Pas encore assez d&apos;avis dans cette catégorie.
          </p>
        )}
        {lignes.map((ligne, i) => (
          <div
            key={ligne.code_insee}
            className="flex items-center gap-4 border-b border-card-edge px-5 py-3.5 last:border-0"
          >
            <span className="w-6 font-mono text-sm text-text-soft">{i + 1}</span>
            <ImageVille nom={ligne.ville} className="h-10 w-10 flex-shrink-0 rounded-xl" />
            <div className="flex-1">
              <p className="font-semibold">{ligne.ville}</p>
              <p className="text-xs text-text-soft">{ligne.region}</p>
            </div>
            <div className="w-24">
              <div className="h-2 overflow-hidden rounded-full bg-card-edge">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(ligne.note_moyenne / 5) * 100}%`,
                    background: 'linear-gradient(120deg, #FF5A56, #FFA726)',
                  }}
                />
              </div>
              <span className="mt-1 block font-mono text-xs">{ligne.note_moyenne}/5</span>
            </div>
            <span className="w-16 text-right font-mono text-xs text-text-soft">
              {ligne.nb_avis} avis
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
