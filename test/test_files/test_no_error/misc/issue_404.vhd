entity issue_404 is
end entity;
architecture arch of issue_404 is
  type write_states is (IDLE, ARP_UPDATE);
  signal write_state : write_states;
  type read_states is (IDLE, ARP_READ_REQUEST, ARP_READ_DATA);
  signal read_state  : read_states;
begin
end architecture;
