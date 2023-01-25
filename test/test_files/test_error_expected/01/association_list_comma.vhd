entity association_list_comma is
end entity;

architecture test of association_list_comma is
begin

inst_test_multiple_definitions : entity work.test_multiple_definitions
port map (
  test => '0',
);


end architecture;