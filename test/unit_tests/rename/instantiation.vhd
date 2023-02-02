

entity instantiation is
end instantiation ;

architecture arch of instantiation is

begin
inst_test_entity : entity work.test_entity_split
port map(foo => 5);

end architecture ;