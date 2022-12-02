entity association_list_comma is
end entity; 

architecture test of association_list_comma is
begin

inst_test_multiple_definitions2 : entity work.test_multiple_definitions2
port map (
  o_test => open,
); -- vhdl-linter-disable-line parser


end architecture;