import React from 'react';
import './LegalPage.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <a href="/login" className="legal-back">← Voltar</a>

        <header className="legal-header">
          <h1>Política de Privacidade</h1>
          <p className="legal-updated">Última atualização: agosto de 2025</p>
        </header>

        <section className="legal-section">
          <h2>1. Sobre o Moviz</h2>
          <p>
            O Moviz é um aplicativo social de cinema que permite aos usuários avaliar filmes,
            compartilhar opiniões, criar listas e se conectar com outros cinéfilos. Esta Política
            de Privacidade descreve como coletamos, usamos e protegemos seus dados pessoais, em
            conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Dados que coletamos</h2>
          <h3>Dados fornecidos por você</h3>
          <ul>
            <li>Nome de usuário e endereço de e-mail (obrigatórios para criar conta)</li>
            <li>Senha (armazenada de forma criptografada — nunca em texto simples)</li>
            <li>Foto de perfil (opcional)</li>
            <li>País de origem (opcional)</li>
          </ul>
          <h3>Dados gerados pelo uso do app</h3>
          <ul>
            <li>Avaliações e reviews de filmes</li>
            <li>Posts e comentários publicados no feed</li>
            <li>Listas de filmes criadas por você</li>
            <li>Conexões sociais (seguidores e seguidos)</li>
            <li>Mensagens diretas trocadas com outros usuários</li>
            <li>Histórico de conversas com o CineBot (assistente de IA)</li>
          </ul>
          <h3>Dados coletados automaticamente</h3>
          <ul>
            <li>Endereço IP (utilizado para controle de segurança e rate limiting)</li>
            <li>Data e hora de acesso</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Como usamos seus dados</h2>
          <ul>
            <li>Criar e manter sua conta no Moviz</li>
            <li>Personalizar recomendações de filmes com base no seu histórico de avaliações</li>
            <li>Exibir seu perfil e conteúdo para outros usuários</li>
            <li>Enviar e-mails transacionais (ex.: redefinição de senha)</li>
            <li>Prevenir fraudes e garantir a segurança da plataforma</li>
            <li>Melhorar o app com base em padrões de uso agregados</li>
          </ul>
          <p>
            Não vendemos seus dados pessoais a terceiros. Não utilizamos seus dados para
            publicidade de terceiros.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Compartilhamento de dados</h2>
          <p>Seus dados podem ser compartilhados apenas nos seguintes casos:</p>
          <ul>
            <li>
              <strong>The Movie Database (TMDB):</strong> buscas de filmes são enviadas à API
              pública do TMDB para retornar resultados. Nenhum dado pessoal seu é enviado.
            </li>
            <li>
              <strong>Anthropic (CineBot):</strong> mensagens enviadas ao CineBot são processadas
              pela API da Anthropic para gerar respostas. Consulte a{' '}
              <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">
                Política de Privacidade da Anthropic
              </a>.
            </li>
            <li>
              <strong>Obrigação legal:</strong> podemos divulgar dados se exigido por lei ou
              ordem judicial.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
            criptografia de senhas com bcrypt, transmissão de dados via HTTPS, autenticação
            por token JWT com expiração e controle de acesso por perfil de usuário.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Seus direitos (LGPD)</h2>
          <p>Como titular dos dados, você tem o direito de:</p>
          <ul>
            <li>Acessar os dados que temos sobre você</li>
            <li>Corrigir dados incompletos ou incorretos</li>
            <li>Solicitar a exclusão dos seus dados pessoais</li>
            <li>Revogar seu consentimento a qualquer momento</li>
            <li>Portabilidade dos seus dados</li>
          </ul>
          <p>
            Para excluir sua conta e todos os dados associados, acesse{' '}
            <strong>Perfil → Configurações → Excluir conta</strong> no app. Você também pode
            solicitar a exclusão por e-mail enviando uma mensagem para{' '}
            <strong>privacy@moviz.app</strong> com o assunto "Exclusão de dados". Para mais
            informações, consulte nossa{' '}
            <a href="https://moviz.app/privacy" target="_blank" rel="noopener noreferrer">
              Política de Privacidade completa
            </a>
            .
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Retenção de dados</h2>
          <p>
            Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir sua conta,
            removemos seus dados pessoais em até 30 dias, exceto onde a retenção for exigida
            por lei.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Menores de idade</h2>
          <p>
            O Moviz não é destinado a menores de 13 anos. Não coletamos intencionalmente dados
            de crianças. Se você acredita que uma criança nos forneceu dados, entre em contato
            para que possamos removê-los.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos usuários
            sobre alterações significativas pelo e-mail cadastrado ou por aviso no app.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Contato</h2>
          <p>
            Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato:
          </p>
          <p className="legal-contact">
            <strong>E-mail:</strong> privacidade@moviz.app
          </p>
        </section>
      </div>
    </div>
  );
}
