import React from 'react';
import './LegalPage.css';

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <a href="/login" className="legal-back">← Voltar</a>

        <header className="legal-header">
          <h1>Termos de Uso</h1>
          <p className="legal-updated">Última atualização: agosto de 2025</p>
        </header>

        <section className="legal-section">
          <h2>1. Aceitação dos termos</h2>
          <p>
            Ao criar uma conta no Moviz ou utilizar o aplicativo, você concorda com estes
            Termos de Uso. Se não concordar, não utilize o serviço.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. O serviço</h2>
          <p>
            O Moviz é uma plataforma social de cinema que permite avaliar filmes, criar listas,
            publicar reviews, seguir outros usuários e interagir com o CineBot, um assistente de
            inteligência artificial especializado em cinema.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Criação de conta</h2>
          <ul>
            <li>Você deve ter pelo menos 13 anos de idade para criar uma conta.</li>
            <li>Você é responsável por manter a segurança da sua senha.</li>
            <li>Cada pessoa pode criar apenas uma conta. Contas múltiplas podem ser removidas.</li>
            <li>Informações falsas ou enganosas podem resultar na suspensão da conta.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Conteúdo do usuário</h2>
          <p>
            Você é responsável pelo conteúdo que publica no Moviz (reviews, comentários, posts,
            mensagens). Ao publicar conteúdo, você garante que:
          </p>
          <ul>
            <li>Tem o direito de publicar tal conteúdo</li>
            <li>O conteúdo não viola direitos de terceiros</li>
            <li>O conteúdo não é ilegal, ofensivo, discriminatório ou abusivo</li>
          </ul>
          <p>
            Você mantém os direitos sobre o conteúdo que cria. Ao publicar, concede ao Moviz
            uma licença não exclusiva para exibir esse conteúdo na plataforma.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Conduta proibida</h2>
          <p>É proibido no Moviz:</p>
          <ul>
            <li>Publicar conteúdo de ódio, assédio ou bullying</li>
            <li>Fazer spam ou publicidade não autorizada</li>
            <li>Tentar comprometer a segurança da plataforma</li>
            <li>Criar perfis falsos ou se passar por outras pessoas</li>
            <li>Coletar dados de outros usuários sem autorização</li>
            <li>Usar o app para fins comerciais sem autorização prévia</li>
          </ul>
          <p>
            Violações podem resultar em remoção de conteúdo, suspensão ou exclusão permanente
            da conta.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. CineBot (assistente de IA)</h2>
          <p>
            O CineBot é um assistente de IA que fornece recomendações e informações sobre cinema.
            Suas respostas são geradas automaticamente e podem conter imprecisões. O Moviz não
            se responsabiliza por decisões tomadas com base nas respostas do CineBot.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Propriedade intelectual</h2>
          <p>
            O nome Moviz, logotipo, design e funcionalidades do app são propriedade do Moviz.
            Dados de filmes são fornecidos pelo{' '}
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
              The Movie Database (TMDB)
            </a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Disponibilidade do serviço</h2>
          <p>
            O Moviz é fornecido "como está". Não garantimos disponibilidade ininterrupta.
            Podemos modificar, suspender ou encerrar funcionalidades a qualquer momento, com
            aviso prévio quando possível.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Exclusão de conta</h2>
          <p>
            Você pode excluir sua conta a qualquer momento em{' '}
            <strong>Perfil → Configurações → Excluir conta</strong>. A exclusão remove seus
            dados pessoais conforme descrito em nossa{' '}
            <a href="/privacy">Política de Privacidade</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Limitação de responsabilidade</h2>
          <p>
            O Moviz não se responsabiliza por danos indiretos, incidentais ou consequentes
            decorrentes do uso ou impossibilidade de uso do serviço.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Lei aplicável</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer
            disputa será submetida ao foro da comarca de São Paulo, SP.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Contato</h2>
          <p>Dúvidas sobre estes Termos de Uso:</p>
          <p className="legal-contact">
            <strong>E-mail:</strong> contato@moviz.app
          </p>
        </section>
      </div>
    </div>
  );
}
