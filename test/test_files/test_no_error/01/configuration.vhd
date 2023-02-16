-- regression test to verify that files with only configurations are not empty (#270)
configuration dut_cfg of for_test is
	for arch
	end for;
end configuration;