configuration test_entity_split_cfg of test_entity_split is
end configuration;

entity instantiation is
end instantiation ;

architecture arch of instantiation is

begin
inst_test_entity : entity work.test_entity_split
port map(foo => 5);
test_entity_split_cfg : configuration work.test_entity_split_cfg
port map(foo => 5);

end architecture ;