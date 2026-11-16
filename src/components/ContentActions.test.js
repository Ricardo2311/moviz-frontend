import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ContentActions from './ContentActions';
import { blockUser, reportContent } from '../api';

jest.mock('../api', () => ({
  blockUser: jest.fn(),
  getCurrentUser: jest.fn(),
  reportContent: jest.fn(),
}));
jest.mock('../authStorage', () => ({ getStoredToken: () => 'token-de-teste' }));

const AUTHOR = { id: 2, username: 'bruno' };

// O CRA usa resetMocks: as implementações precisam ser definidas a cada teste.
beforeEach(() => {
  blockUser.mockResolvedValue({ message: 'ok' });
  reportContent.mockResolvedValue({ message: 'Denúncia recebida. Nossa equipe vai analisar em até 24 horas.' });
});

test('não mostra o menu no conteúdo da própria pessoa', () => {
  render(<ContentActions targetType="post" targetId={10} author={{ id: 1, username: 'eu' }} currentUserId={1} />);
  expect(screen.queryByLabelText('Mais opções')).toBeNull();
});

test('denuncia um post escolhendo o motivo', async () => {
  render(<ContentActions targetType="post" targetId={10} author={AUTHOR} currentUserId={1} />);
  fireEvent.click(screen.getByLabelText('Mais opções'));
  fireEvent.click(screen.getByText('Denunciar post'));

  const send = screen.getByText('Enviar denúncia');
  expect(send).toBeDisabled(); // sem motivo escolhido
  fireEvent.click(screen.getByLabelText('Discurso de ódio'));
  fireEvent.change(screen.getByPlaceholderText('Detalhes (opcional)'), { target: { value: 'ataque a um grupo' } });
  fireEvent.click(send);

  await screen.findByText('Obrigado por avisar');
  expect(reportContent).toHaveBeenCalledWith('token-de-teste', {
    targetType: 'post', targetId: 10, reason: 'hate', details: 'ataque a um grupo',
  });
});

test('bloqueia depois de confirmar e avisa a tela', async () => {
  window.confirm = jest.fn(() => true);
  const onBlocked = jest.fn();
  render(<ContentActions targetType="comment" targetId={5} author={AUTHOR} currentUserId={1} onBlocked={onBlocked} />);
  fireEvent.click(screen.getByLabelText('Mais opções'));
  fireEvent.click(screen.getByText('Bloquear @bruno'));

  await waitFor(() => expect(onBlocked).toHaveBeenCalledWith(AUTHOR));
  expect(blockUser).toHaveBeenCalledWith('token-de-teste', 2);
});

test('não bloqueia se a pessoa cancelar a confirmação', () => {
  window.confirm = jest.fn(() => false);
  render(<ContentActions targetType="user" targetId={2} author={AUTHOR} currentUserId={1} />);
  fireEvent.click(screen.getByLabelText('Mais opções'));
  fireEvent.click(screen.getByText('Bloquear @bruno'));
  expect(blockUser).not.toHaveBeenCalled();
});
