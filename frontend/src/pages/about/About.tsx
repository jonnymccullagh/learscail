import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-shell'
import { useState, useEffect } from 'react'

function About() {
  const { t } = useTranslation()
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    // Fetch version from VERSION.txt
    fetch('/VERSION.txt')
      .then(response => response.text())
      .then(text => setVersion(text.trim()))
      .catch(() => setVersion('Unknown'))
  }, [])

  const openLink = async (url: string) => {
    await open(url)
  }

  return (
    <div className="p-6 pb-20 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">{t('about')}</h1>

      {/* Privacy */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 text-blue-600">{t('privacy')}</h2>
        <p className="text-gray-700 leading-relaxed">{t('privacyText')}</p>
      </section>

      {/* Acknowledgements */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 text-blue-600">{t('acknowledgements')}</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>{t('acknowledgementsComer')}</li>
          <li>{t('acknowledgementsOSM')}</li>
          <li>{t('acknowledgementsLogainm')}</li>
          <li>{t('acknowledgementsGraphhopper')}</li>
          <li>{t('acknowledgementsGeograph')}</li>
        </ul>
      </section>

      {/* Created by */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 text-blue-600">{t('createdBy')}</h2>
        <p className="text-gray-700 font-medium">Jonny Mac Cú Uladh / Jonny McCullagh</p>
      </section>

      {/* Copyright & License */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 text-blue-600">{t('copyrightLicense')}</h2>
        <p className="text-gray-700 leading-relaxed">{t('copyrightText')}</p>
      </section>

      {/* Motivation */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 text-blue-600">{t('motivation')}</h2>
        <p className="text-gray-700 leading-relaxed">{t('motivationText')}</p>
      </section>

      {/* Contributions */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3 text-blue-600">{t('contributions')}</h2>
        <div className="space-y-4 text-gray-700">
          <p className="leading-relaxed">{t('contributionsOSM')}</p>
          <p className="leading-relaxed">{t('contributionsAudio')}</p>
          <div>
            <p className="mb-2">{t('contributionsContact')}</p>
            <button
              onClick={() => openLink('https://github.com/jonnymccullagh/learscail/discussions')}
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              https://github.com/jonnymccullagh/learscail/discussions
            </button>
            <button
              onClick={() => openLink('https://www.linkedin.com/in/jonnymccullagh/')}
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              https://www.linkedin.com/in/jonnymccullagh/
            </button>
          </div>
          <p className="italic text-gray-600 leading-relaxed">{t('contributionsDisclaimer')}</p>
        </div>
      </section>

      {/* Version */}
      {version && (
        <section className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            Version {version}
          </p>
        </section>
      )}
    </div>
  )
}

export default About
