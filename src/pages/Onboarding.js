import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { searchMovies, searchPeople, submitOnboarding } from '../api';
import { getStoredToken } from '../authStorage';

const STEPS = [
  'Gêneros',
  'Filmes',
  'Décadas',
  'Idiomas e países',
  'Pessoas',
  'Frequência',
  'Finalizar',
];

const GENRES = [
  'Ação',
  'Aventura',
  'Animação',
  'Comédia',
  'Crime',
  'Documentário',
  'Drama',
  'Família',
  'Fantasia',
  'História',
  'Mistério',
  'Romance',
  'Sci-Fi',
  'Suspense',
  'Terror',
];

const DECADES = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
const LANGUAGES = ['English', 'Portuguese', 'Spanish', 'French', 'German', 'Italian', 'Japanese', 'Korean'];
const COUNTRIES = ['USA', 'Brazil', 'UK', 'France', 'South Korea', 'Japan', 'Spain', 'Argentina'];
const FREQUENCIES = [
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekly', label: 'Algumas vezes por semana' },
  { value: 'monthly', label: 'Algumas vezes por mês' },
  { value: 'occasionally', label: 'De vez em quando' },
];

function SearchResultCard({ imagePath, title, subtitle, onClick }) {
  return (
    <button type="button" className="onboarding-search-card" onClick={onClick}>
      {imagePath ? (
        <img src={`https://image.tmdb.org/t/p/w185${imagePath}`} alt={title} />
      ) : (
        <div className="onboarding-search-fallback">{title.slice(0, 1)}</div>
      )}
      <div>
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
    </button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [preferredDecades, setPreferredDecades] = useState([]);
  const [preferredLanguages, setPreferredLanguages] = useState([]);
  const [preferredCountries, setPreferredCountries] = useState([]);
  const [favoritePeople, setFavoritePeople] = useState([]);
  const [watchFrequency, setWatchFrequency] = useState('weekly');
  const [movieQuery, setMovieQuery] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [movieResults, setMovieResults] = useState([]);
  const [personResults, setPersonResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = getStoredToken();
  const progress = ((step + 1) / STEPS.length) * 100;

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!token || movieQuery.trim().length < 2) {
      setMovieResults([]);
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const payload = await searchMovies(token, movieQuery.trim());
        setMovieResults(payload);
      } catch (err) {
        setError(err.message);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [movieQuery, token]);

  useEffect(() => {
    if (!token || personQuery.trim().length < 2) {
      setPersonResults([]);
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const payload = await searchPeople(token, personQuery.trim());
        setPersonResults(payload);
      } catch (err) {
        setError(err.message);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [personQuery, token]);

  const canGoBack = step > 0;
  const isLastStep = step === STEPS.length - 1;

  const summaryItems = useMemo(
    () => [
      {
        title: 'Gêneros favoritos',
        value: favoriteGenres.length ? favoriteGenres.join(', ') : 'Nenhum gênero selecionado.',
        stepIndex: 0,
      },
      {
        title: 'Filme favorito',
        value: favoriteMovies.length
          ? favoriteMovies[0].title
          : 'Nenhum filme selecionado.',
        stepIndex: 1,
      },
      {
        title: 'Décadas preferidas',
        value: preferredDecades.length ? preferredDecades.join(', ') : 'Nenhuma década selecionada.',
        stepIndex: 2,
      },
      {
        title: 'Idiomas',
        value: preferredLanguages.length
          ? preferredLanguages.join(', ')
          : 'Nenhum idioma selecionado.',
        stepIndex: 3,
      },
      {
        title: 'Países',
        value: preferredCountries.length
          ? preferredCountries.join(', ')
          : 'Nenhum país selecionado.',
        stepIndex: 3,
      },
      {
        title: 'Atores e diretores favoritos',
        value: favoritePeople.length
          ? favoritePeople.map((person) => person.name).join(', ')
          : 'Nenhuma pessoa favorita selecionada.',
        stepIndex: 4,
      },
      {
        title: 'Frequência',
        value: FREQUENCIES.find((item) => item.value === watchFrequency)?.label || 'Não definida',
        stepIndex: 5,
      },
    ],
    [
      favoriteGenres,
      favoriteMovies,
      preferredDecades,
      preferredLanguages,
      preferredCountries,
      favoritePeople,
      watchFrequency,
    ]
  );

  const toggleArrayValue = (setter, value) => {
    setter((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  const addFavoriteMovie = (movie) => {
    setFavoriteMovies([
      {
        movie_id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
      },
    ]);
    setError('');
    setMovieQuery('');
    setMovieResults([]);
  };

  const addFavoritePerson = (person) => {
    setFavoritePeople((current) =>
      current.some((item) => item.person_id === person.id)
        ? current
        : [
            ...current,
            {
              person_id: person.id,
              name: person.name,
              profile_path: person.profile_path,
              role: person.known_for_department,
            },
          ]
    );
    setPersonQuery('');
    setPersonResults([]);
  };

  const removeMovie = (movieId) => {
    setFavoriteMovies((current) => current.filter((movie) => movie.movie_id !== movieId));
  };

  const removePerson = (personId) => {
    setFavoritePeople((current) => current.filter((person) => person.person_id !== personId));
  };

  const handleNext = async () => {
    if (step === 1 && !favoriteMovies.length) {
      setError('Escolha um filme favorito para continuar.');
      return;
    }
    if (!isLastStep) {
      setError('');
      setStep((current) => current + 1);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await submitOnboarding(token, {
        favorite_genres: favoriteGenres,
        favorite_movies: favoriteMovies,
        preferred_decades: preferredDecades,
        preferred_languages: preferredLanguages,
        preferred_countries: preferredCountries,
        favorite_people: favoritePeople,
        watch_frequency: watchFrequency,
      });
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-page">
      <section className="onboarding-shell">
        <div className="onboarding-progress">
          <div>
            <p className="eyebrow">Onboarding</p>
            <h1>Configure suas preferências iniciais</h1>
            <p>
              Essas escolhas vão alimentar as primeiras recomendações do app antes da camada de IA.
            </p>
          </div>
          <div className="onboarding-progress-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="onboarding-step-copy">
            Etapa {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
        </div>

        <section className="onboarding-card">
          {step === 0 ? (
            <>
              <h2>Selecione seus generos favoritos</h2>
              <div className="onboarding-chip-grid">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    className={`onboarding-chip ${favoriteGenres.includes(genre) ? 'active' : ''}`}
                    onClick={() => toggleArrayValue(setFavoriteGenres, genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="onboarding-step-header">
                <div>
                  <h2>Escolha seu filme favorito</h2>
                  <p>Esse filme vai aparecer no seu perfil e servir de base inicial para o app.</p>
                </div>
              </div>
              <input
                className="onboarding-search-input"
                value={movieQuery}
                onChange={(e) => setMovieQuery(e.target.value)}
                placeholder="Buscar filmes"
              />
              <div className="onboarding-search-grid">
                {movieResults.map((movie) => (
                  <SearchResultCard
                    key={movie.id}
                    imagePath={movie.poster_path}
                    title={movie.title}
                    subtitle={movie.release_date}
                    onClick={() => addFavoriteMovie(movie)}
                  />
                ))}
              </div>
              <div className="onboarding-selected-list">
                {favoriteMovies.map((movie) => (
                  <button
                    key={movie.movie_id}
                    type="button"
                    className="onboarding-selected-chip"
                    onClick={() => removeMovie(movie.movie_id)}
                  >
                    {movie.title} x
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2>Quais décadas você prefere?</h2>
              <div className="onboarding-chip-grid">
                {DECADES.map((decade) => (
                  <button
                    key={decade}
                    type="button"
                    className={`onboarding-chip ${preferredDecades.includes(decade) ? 'active' : ''}`}
                    onClick={() => toggleArrayValue(setPreferredDecades, decade)}
                  >
                    {decade}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2>Idiomas e países</h2>
              <p className="onboarding-inline-copy">Misture idiomas originais e cinematografias favoritas.</p>
              <div className="onboarding-dual-grid">
                <div>
                  <h3>Idiomas</h3>
                  <div className="onboarding-chip-grid compact">
                    {LANGUAGES.map((language) => (
                      <button
                        key={language}
                        type="button"
                        className={`onboarding-chip ${preferredLanguages.includes(language) ? 'active' : ''}`}
                        onClick={() => toggleArrayValue(setPreferredLanguages, language)}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Países</h3>
                  <div className="onboarding-chip-grid compact">
                    {COUNTRIES.map((country) => (
                      <button
                        key={country}
                        type="button"
                        className={`onboarding-chip ${preferredCountries.includes(country) ? 'active' : ''}`}
                        onClick={() => toggleArrayValue(setPreferredCountries, country)}
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div className="onboarding-step-header">
                <div>
                  <h2>Atores e diretores favoritos</h2>
                  <p>Opcional. Isso ajuda bastante quando você gosta de nomes específicos.</p>
                </div>
                <button type="button" className="filter-reset" onClick={() => setStep(step + 1)}>
                  Pular
                </button>
              </div>
              <input
                className="onboarding-search-input"
                value={personQuery}
                onChange={(e) => setPersonQuery(e.target.value)}
                placeholder="Buscar atores ou diretores"
              />
              <div className="onboarding-search-grid">
                {personResults.map((person) => (
                  <SearchResultCard
                    key={person.id}
                    imagePath={person.profile_path}
                    title={person.name}
                    subtitle={person.known_for_department}
                    onClick={() => addFavoritePerson(person)}
                  />
                ))}
              </div>
              <div className="onboarding-selected-list">
                {favoritePeople.map((person) => (
                  <button
                    key={person.person_id}
                    type="button"
                    className="onboarding-selected-chip"
                    onClick={() => removePerson(person.person_id)}
                  >
                    {person.name} x
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h2>Com que frequência você assiste filmes?</h2>
              <div className="onboarding-frequency-list">
                {FREQUENCIES.map((frequency) => (
                  <button
                    key={frequency.value}
                    type="button"
                    className={`onboarding-frequency-card ${
                      watchFrequency === frequency.value ? 'active' : ''
                    }`}
                    onClick={() => setWatchFrequency(frequency.value)}
                  >
                    <strong>{frequency.label}</strong>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h2>Resumo e primeiras recomendações</h2>
              <p className="onboarding-inline-copy">
                Ao salvar, o app gera sua base inicial e segue para a home.
              </p>
              <div className="onboarding-summary-list">
                {summaryItems.map((item) => (
                  <article key={item.title} className="onboarding-summary-card">
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.value}</p>
                    </div>
                    <button
                      type="button"
                      className="secondary-button onboarding-edit-button"
                      onClick={() => setStep(item.stepIndex)}
                    >
                      Editar
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : null}

          {error ? <p className="error">{error}</p> : null}

          <div className="onboarding-actions">
            {canGoBack ? (
              <button type="button" className="secondary-button" onClick={() => setStep(step - 1)}>
                Voltar
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="primary-button" onClick={handleNext} disabled={saving}>
              {isLastStep ? (saving ? 'Salvando...' : 'Salvar e gerar recomendações') : 'Continuar'}
            </button>
          </div>
        </section>
      </section>
    </div>
  );
}

export default Onboarding;
